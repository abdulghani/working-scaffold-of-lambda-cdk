import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Element, RecordItem } from "@/constants/element";
import { wrapActionError } from "@/lib/action-error";
import { calculateTax } from "@/lib/calculate-tax";
import { formatPrice } from "@/lib/format-price";
import { padNumber } from "@/lib/pad-number";
import { parsePhone } from "@/lib/parse-phone";
import { useLocalStorageState } from "@/lib/use-localstorage-state";
import { useRevalidation } from "@/lib/use-revalidation";
import { cn } from "@/lib/utils";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useParams
} from "@remix-run/react";
import type { Menu } from "app/service/menu";
import { getMenuByPOS, getMenuCategoryPOS } from "app/service/menu";
import {
  createOrder,
  getOrder,
  ORDER_CANCELLABLE_STATUS,
  ORDER_ERROR_CODE,
  ORDER_STATUS_ENUM,
  ORDER_STATUS_LABEL_ID,
  orderCookie,
  userCancelOrder
} from "app/service/order";
import { getPOSTax, validatePOSId } from "app/service/pos";
import { startCase } from "lodash-es";
import {
  Ban,
  CircleCheck,
  CircleX,
  ShoppingCart,
  Timer,
  Utensils
} from "lucide-react";
import { DateTime } from "luxon";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useDebouncedMenu } from "./admin.$posId";
import {
  orderDraftReducer,
  OrderDraftShape
} from "./menu.$posId/order-draft-reducer";
import { createInstanceId, parseInstanceId } from "./menu.$posId/order-helper";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { posId } = params;
  const cookie = await orderCookie.parse(request.headers.get("Cookie"));

  const [pos, menus, menuCategories, order, posTax] = await Promise.all([
    validatePOSId?.(posId!),
    getMenuByPOS?.(posId!),
    getMenuCategoryPOS?.(posId!),
    getOrder?.(cookie),
    getPOSTax?.(posId!)
  ]);

  const menuMap = Object.fromEntries(menus?.map((i) => [i.id, i]) || []);
  const addonGroupMap = Object.fromEntries(
    menus?.flatMap((i) => i.addon_groups)?.map((i) => [i?.id, i]) || []
  );
  const addonMap = Object.fromEntries(
    menus
      ?.flatMap((i) => i.addon_groups?.flatMap((j) => j.addons))
      ?.map((i) => [i?.id, i]) || []
  );

  return {
    pos,
    menus,
    menuCategories,
    order,
    menuMap,
    addonGroupMap,
    addonMap,
    posTax
  };
}

export const action = wrapActionError(async function ({
  request
}: ActionFunctionArgs) {
  const payload = await request.formData().then(Object.fromEntries);
  const cookie = await orderCookie.parse(request.headers.get("Cookie"));

  if (payload._action === "_createOrder") {
    payload.instance_record_json = JSON.parse(
      payload.instance_record_json || "{}"
    );
    const result = await createOrder?.(payload);
    if (result?.id) {
      throw redirect(`/${payload.pos_id}/menu`, {
        headers: {
          "Set-Cookie": await orderCookie.serialize(result.id)
        }
      });
    }
  } else if (payload._action === "_cancelOrder") {
    await userCancelOrder?.(cookie, payload?.notes);
    throw redirect(`/${payload.pos_id}/menu`, {
      headers: {
        "Set-Cookie": await orderCookie.serialize("", { maxAge: 0 })
      }
    });
  }

  return {};
});

export default function Menu() {
  const { posId } = useParams();
  const {
    pos,
    menus,
    menuCategories,
    order,
    menuMap,
    addonMap,
    addonGroupMap,
    posTax
  } = useLoaderData<typeof loader>();
  const action = useActionData<any>();

  useRevalidation();

  /** STATE RELATED */
  const [draftOrder, setDraftOrder] = useLocalStorageState<OrderDraftShape>(
    `order-draft-${posId}`,
    {}
  );
  const [instanceTemp, setInstanceTemp] =
    useState<RecordItem<OrderDraftShape> | null>(null);
  const [menuTemp, setMenuTemp] = useState<Partial<
    RecordItem<OrderDraftShape>
  > | null>(null);
  const [cancelDialog, setCancelDialog] = useState<boolean>(false);

  /** UI RELATED */
  const [filter, setFilter] = useState<any>(menuCategories?.find(Boolean)?.id);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null
  );
  const { toast } = useToast();

  /** STATE UTIL OPTIMIZATION, DEBOUNCED */
  const selectedMenuIdDebounced = useDebouncedMenu(selectedMenuId, 500);
  const selectedInstanceIdDebounced = useDebouncedMenu(selectedInstanceId, 500);
  const draftTotal = useMemo(() => {
    return Object.values(draftOrder || {}).reduce((t, instance) => {
      const basePrice = Number(menuMap[instance.menu_id]?.price) || 0;
      const addonPrice =
        instance.addon_ids?.reduce((t2, addonId) => {
          const addon = addonMap[addonId];
          if (addon) {
            return t2 + Number(addon.price);
          }
          return t2;
        }, 0) || 0;

      const instancePrice = (basePrice + addonPrice) * instance.qty;

      return t + instancePrice;
    }, 0);
  }, [draftOrder, menuMap, addonMap]);

  /** MENU ADDON SELECTION, LOCAL TO STATE */
  function toggleSelection(addonId: string, selection: any) {
    const addon = addonMap[addonId];
    const addonGroup = addonGroupMap[addon?.addon_group_id];

    /** SET TOGGLE VALUE */
    const nextValue = (() => {
      const _nextValue = !selection[addonId];

      /** DISABLE TOGGLE IF IT'S REQUIRED */
      if (
        !_nextValue &&
        addonGroup?.required &&
        !addonGroup?.addons?.filter((i) => i.id !== addonId && selection[i.id])
          .length
      ) {
        return !_nextValue;
      }

      return _nextValue;
    })();
    selection[addonId] = nextValue;

    /** DESELECT OTHER PAIR IF ONE SELECTION */
    if (
      nextValue &&
      !addonGroup?.multiple_select &&
      addonGroup?.addons?.length
    ) {
      addonGroup.addons?.forEach((i) => {
        if (i.id !== addonId) {
          selection[i.id] = !nextValue;
        }
      });
    }

    return selection;
  }

  function initializeAddon(menuId: string): string[] {
    const menu = menuMap[menuId];
    const requiredAddons = menu?.addon_groups?.filter(
      (i) => i.active && (i.required || i.default_addon_id)
    );

    if (requiredAddons?.length) {
      const selectedAddonIds = requiredAddons
        .map((i) => {
          if (i.default_addon_id && addonMap[i.default_addon_id]?.active) {
            return i.default_addon_id;
          }
          return i.addons?.filter((j) => j.active).find(Boolean)?.id;
        })
        .filter(Boolean) as string[];

      return selectedAddonIds;
    }

    return [];
  }

  useEffect(() => {
    if (action?.error?.code === ORDER_ERROR_CODE.ORDER_NOT_CANCELLABLE) {
      toast({
        title: (
          <div className="flex flex-row items-center">
            <CircleX className="mr-1.5 h-4 w-4 text-red-500" />
            Pesanan gagal dibatalkan
          </div>
        ),
        description: (
          <span className="text-xs">{action?.error?.details?.status}</span>
        ),
        duration: 5000
      });
    }
  }, [action]);

  return (
    <div className="flex w-full justify-center">
      <Tabs defaultValue="menu" className="w-full lg:w-[400px]">
        <TabsList className="sticky top-3 z-10 mx-4 mt-3 flex flex-row">
          <TabsTrigger className="w-full" value="menu">
            Menu
          </TabsTrigger>
          <TabsTrigger
            className="w-full"
            value="order"
            onClick={() =>
              setDraftOrder(
                orderDraftReducer(draftOrder, {
                  type: "CLEAR_EMPTY",
                  data: { menuMap }
                })
              )
            }
          >
            <span className="block">Pesanan</span>
            {(() => {
              if (order?.status === ORDER_STATUS_ENUM.ACCEPTED) {
                return <Utensils className="ml-1.5 h-4 w-4" />;
              } else if (order?.status === ORDER_STATUS_ENUM.COMPLETED) {
                return <CircleCheck className="ml-1.5 h-4 w-4" />;
              } else if (order?.status === ORDER_STATUS_ENUM.CANCELLED) {
                return <Ban className="ml-1.5 h-4 w-4" />;
              } else if (order?.id) {
                return <Timer className="ml-1.5 h-4 w-4" />;
              } else if (Object.keys(draftOrder || {}).length) {
                return <ShoppingCart className="ml-1.5 h-4 w-4" />;
              }
            })()}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="m-0 overflow-x-hidden p-0 pb-8">
          <Card className="m-0 border-0 p-0 shadow-none">
            <CardHeader className="py-4">
              <div className="flex flex-row items-center">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={pos?.profile_img} />
                  <AvatarFallback>{pos?.name?.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="ml-3 flex flex-col overflow-hidden pr-4">
                  <CardTitle className="truncate">{pos.name}</CardTitle>
                  <CardDescription className="truncate">
                    Menu {pos.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="m-0 p-0">
              <div className="flex w-screen snap-x snap-mandatory flex-row overflow-x-scroll px-4 pb-2">
                {menus?.map((menu) => (
                  <Link
                    to="#"
                    className="mr-3 w-[42.5svh] shrink-0 snap-center lg:w-[320px]"
                    target="_self"
                    onClick={() => {
                      setSelectedMenuId(menu?.id);
                      setMenuTemp({
                        menu_id: menu?.id,
                        qty: 1,
                        addon_ids: initializeAddon(menu?.id)
                      });
                    }}
                    key={`carousel-${menu.id}`}
                  >
                    <img
                      className="aspect-[5/3] w-full rounded-md object-cover"
                      src={menu.imgs?.find(Boolean)}
                    />
                    <div className="mt-1.5 flex flex-row justify-between">
                      <span className="font-base truncate text-sm text-muted-foreground">
                        {menu.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="flex w-screen snap-x snap-mandatory flex-row gap-3 overflow-x-scroll px-4 py-3">
                {[
                  { id: "all", title: "Semua" },
                  ...(menuCategories || [])
                ]?.map((menu) => (
                  <Button
                    variant={"secondary"}
                    className={cn(
                      "hover:bg-background hover:shadow-inner",
                      filter === menu.id && "bg-background shadow-inner"
                    )}
                    onClick={() => setFilter(menu.id)}
                    key={`menu-${menu.id}`}
                  >
                    {startCase(menu.title)}
                  </Button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 px-4">
                {(() => {
                  if (filter && filter !== "all") {
                    return menus?.filter((menu) =>
                      menu.categories?.includes(filter)
                    );
                  }
                  return menus;
                })()?.map((menu) => (
                  <Link
                    to="#"
                    className="shrink-0 snap-center"
                    target="_self"
                    key={`list-${menu.id}`}
                    onClick={() => {
                      setSelectedMenuId(menu?.id);
                      setMenuTemp({
                        menu_id: menu.id,
                        qty: 1,
                        addon_ids: initializeAddon(menu.id)
                      });
                    }}
                  >
                    <img
                      className="aspect-[4/3] w-full rounded-md object-cover"
                      src={menu.imgs?.find(Boolean)}
                    />
                    <div className="flex flex-row justify-between">
                      <span className="font-base ml-0.5 mt-1.5 block truncate whitespace-nowrap text-sm text-muted-foreground">
                        {menu.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="order" className="m-0 p-0">
          {order?.id ? (
            (() => {
              const _addonMap = Object.fromEntries(
                Object.values(order.menu_snapshot)
                  ?.flatMap((i) => i.addon_groups?.flatMap((j) => j.addons))
                  ?.map((i) => [i?.id, i]) || []
              ) as {
                [key: string]: Element<Element<Menu["addon_groups"]>["addons"]>;
              };
              const _currentTotal: number = Object.values(
                order.instance_record_json || {}
              ).reduce((t, instance: any) => {
                const basePrice =
                  Number(order.menu_snapshot[instance.menu_id]?.price) || 0;
                const addonPrice =
                  instance.addon_ids?.reduce((t2, addonId: any) => {
                    const addon = _addonMap[addonId];
                    if (addon) {
                      return t2 + Number(addon.price);
                    }
                    return t2;
                  }, 0) || 0;

                const instancePrice = (basePrice + addonPrice) * instance.qty;

                return t + instancePrice;
              }, 0);

              const _totalWTax = order?.tax_snapshot?.value
                ? _currentTotal +
                  calculateTax(_currentTotal, order.tax_snapshot.value)
                : _currentTotal;

              return (
                <div className="mt-3 flex flex-col px-5">
                  <div className="flex flex-row items-center text-xl">
                    <span className="block font-semibold">
                      Pesanan no {padNumber(order.temp_count)}
                    </span>
                    {order.status === "ACCEPTED" ? (
                      <Utensils className="ml-1.5 h-5 w-5 text-green-400" />
                    ) : order.status === "COMPLETED" ? (
                      <CircleCheck className="ml-1.5 h-5 w-5 text-green-400" />
                    ) : order.status === "CANCELLED" ? (
                      <Ban className="ml-1.5 h-5 w-5 text-red-500" />
                    ) : (
                      <Timer className="ml-1.5 h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div className="mb-1 text-sm text-muted-foreground">
                    Anda sudah membuat pesanan
                  </div>

                  <Table className="mb-1 border-b border-muted">
                    <TableBody>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell className="text-right">
                          {padNumber(order.temp_count)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Nama</TableCell>
                        <TableCell className="text-right">
                          {order.name}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell className="text-right">
                          {ORDER_STATUS_LABEL_ID[order.status]}
                        </TableCell>
                      </TableRow>
                      {order.notes && (
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Catatan
                          </TableCell>
                          <TableCell className="text-right">
                            {order.notes}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>Waktu</TableCell>
                        <TableCell className="text-right">
                          <span className="block">
                            {DateTime.fromISO(order.created_at).toFormat(
                              "dd MMM yyyy, HH:mm ZZZZ"
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {DateTime.fromISO(order.created_at).toRelative()}
                          </span>
                        </TableCell>
                      </TableRow>
                      {order.tax_snapshot?.value && (
                        <TableRow className="text-xs">
                          <TableCell className="whitespace-nowrap">
                            Pajak daerah ({order.tax_snapshot.value}%)
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPrice(
                              calculateTax(
                                _currentTotal,
                                order.tax_snapshot.value
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>
                          <span className="block">Total</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="block">
                            {formatPrice(_totalWTax)}
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="">
                    {Object.entries(order.instance_record_json || {}).map(
                      ([key, instance]: any) => {
                        const { notes, qty } = instance;
                        const { menuId } = parseInstanceId(key);
                        const menu = order.menu_snapshot[menuId];

                        const addons =
                          instance.addon_ids
                            ?.map((i) => addonMap[i])
                            .filter(Boolean) || [];
                        const currentPrice = addons.reduce(
                          (t, i) => t + Number(i.price),
                          Number(menu.price) || 0
                        );

                        return (
                          <div
                            className="-mx-2 flex flex-row rounded-sm px-2 py-2 transition-colors hover:bg-muted"
                            key={key}
                          >
                            <img
                              src={menu.imgs?.find(Boolean)}
                              className="aspect-[1] h-14 w-14 rounded-sm object-cover"
                            />
                            <div className="flex w-full flex-row justify-between overflow-hidden">
                              <div className="ml-3 flex flex-col justify-between overflow-hidden">
                                <div className="flex flex-col">
                                  <span className="block truncate text-sm font-semibold">
                                    {menu.title}
                                  </span>
                                  {addons?.length ? (
                                    <span className="block text-xs text-muted-foreground">
                                      {addons
                                        ?.map((addon: any) => addon?.title)
                                        .join(", ")}
                                    </span>
                                  ) : (
                                    <span className="block truncate text-xs text-muted-foreground">
                                      {menu.description}
                                    </span>
                                  )}
                                  {notes && (
                                    <span className="block text-xs text-muted-foreground">
                                      {`Catatan: ${notes}`}
                                    </span>
                                  )}
                                </div>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  {formatPrice(currentPrice)}
                                </span>
                              </div>
                              <div className="ml-4 flex flex-col justify-center">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  value={qty}
                                  className="w-12 text-center"
                                  disabled
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                  <div className="mb-4 flex w-full flex-col">
                    <Button
                      variant={"secondary"}
                      className="mt-2 w-full"
                      onClick={() => setCancelDialog(true)}
                      disabled={
                        !ORDER_CANCELLABLE_STATUS.includes(order.status)
                      }
                    >
                      {order.status === ORDER_STATUS_ENUM.PENDING
                        ? "Batalkan pesanan"
                        : "Buat pesanan baru"}
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="mt-2 flex flex-col px-5">
              {Object.entries(draftOrder || {}).map(([key, instance]) => {
                const { menu_id, notes, qty } = instance;
                const menu = menuMap[menu_id];

                if (!menu) return null;

                const addons =
                  instance.addon_ids?.map((i) => addonMap[i]).filter(Boolean) ||
                  [];
                const currentPrice = addons.reduce(
                  (t, i) => t + Number(i.price),
                  Number(menu.price) || 0
                );

                return (
                  <div
                    className="-mx-2 flex flex-row rounded-sm px-2 py-2 transition-colors hover:bg-zinc-100"
                    key={`draft-${key}`}
                    onClick={() => {
                      setSelectedInstanceId(key);
                      setInstanceTemp(instance);
                    }}
                  >
                    <img
                      src={menu.imgs?.find(Boolean)}
                      className="aspect-[1] h-16 w-16 rounded-sm object-cover"
                    />
                    <div className="flex w-full flex-row justify-between overflow-hidden">
                      <div className="ml-3 flex flex-col justify-between overflow-hidden">
                        <div className="flex flex-col">
                          <span className="block truncate font-semibold">
                            {menu.title}
                          </span>
                          {addons?.length ? (
                            <span className="block text-xs text-muted-foreground">
                              {addons?.map((addon) => addon?.title).join(", ")}
                            </span>
                          ) : (
                            <span className="block truncate text-xs text-muted-foreground">
                              {menu.description}
                            </span>
                          )}
                          {notes && (
                            <span className="block text-xs text-muted-foreground">
                              {`Catatan: ${notes}`}
                            </span>
                          )}
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatPrice(currentPrice)}
                        </span>
                      </div>
                      <div className="ml-4 flex flex-col justify-center">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={qty}
                          className="w-12 text-center"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {!Object.keys(draftOrder || {}).length && (
                <Button className="mt-4" variant="ghost" disabled>
                  Pesanan Anda masih kosong
                </Button>
              )}
              {Object.keys(draftOrder || {}).length > 0 && (
                <>
                  <Table className="">
                    <TableBody>
                      {posTax?.value && (
                        <TableRow className="text-xs text-muted-foreground">
                          <TableCell className="whitespace-nowrap px-2 text-left">
                            Pajak daerah ({posTax.value}%)
                          </TableCell>
                          <TableCell className="px-2 text-right">
                            {formatPrice(
                              calculateTax(draftTotal, posTax.value)
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell className="whitespace-nowrap px-2 text-left">
                          Total
                        </TableCell>
                        <TableCell className="px-2 text-right">
                          {formatPrice(
                            posTax?.value
                              ? draftTotal +
                                  calculateTax(draftTotal, posTax.value)
                              : draftTotal
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Form method="post">
                    <div className="mt-2 space-y-1">
                      <Label htmlFor="name">
                        Atas nama{" "}
                        {action?.error?.details?.name && (
                          <span className="font-normal text-red-600">
                            ({action.error.details.name.message})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        className={`capitalize ${action?.error?.details?.name && "border-red-400"}`}
                        placeholder="Nama Anda"
                        required
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      <Label htmlFor="phone">
                        No Handphone{" "}
                        {action?.error?.details?.phone && (
                          <span className="font-normal text-red-600">
                            ({action.error.details.phone.message})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="text"
                        autoComplete="tel"
                        min={8}
                        inputMode="numeric"
                        placeholder="No Handphone Anda"
                        className={`${action?.error?.details?.phone && "border-red-400"}`}
                        onChange={(e) => {
                          e.target.value = parsePhone(e.target.value);
                        }}
                      />
                    </div>
                    <Input type="hidden" name="pos_id" value={posId} />
                    <Input
                      type="hidden"
                      name="instance_record_json"
                      value={JSON.stringify(draftOrder)}
                    />
                    <Input type="hidden" name="_action" value="_createOrder" />
                    <Button
                      className="mt-5 w-full"
                      variant="default"
                      type="submit"
                    >
                      Buat pesanan
                    </Button>
                  </Form>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent className="py-8 sm:rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesanan akan dihapus dan tidak bisa dikembalikan
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form
            method="post"
            className="w-full"
            onSubmit={() => {
              setDraftOrder(
                orderDraftReducer(draftOrder, { type: "CLEAR_COOKIE" })
              );
              setCancelDialog(false);
            }}
          >
            <Input type="hidden" name="_action" value="_cancelOrder" />
            <Input type="hidden" name="order_id" value={order?.id} />
            <Input type="hidden" name="pos_id" value={posId} />
            {order?.status === "PENDING" && (
              <Textarea
                rows={2}
                className="mb-3"
                placeholder="Alasan pembatalan"
                minLength={3}
                name="notes"
              />
            )}
            <div className="flex flex-row items-center justify-center">
              <AlertDialogAction type="submit" className="mr-3 w-1/2">
                Hapus
              </AlertDialogAction>
              <AlertDialogCancel className="mt-0 w-1/2">
                Batal
              </AlertDialogCancel>
            </div>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer
        open={!!selectedInstanceId}
        onOpenChange={(e) => {
          if (!e) {
            setSelectedMenuId(null);
            setSelectedInstanceId(null);
            setInstanceTemp(null);
            setDraftOrder(
              orderDraftReducer(draftOrder, {
                type: "CLEAR_EMPTY",
                data: { menuMap }
              })
            );
          }
        }}
        disablePreventScroll={true}
        handleOnly={true}
      >
        {(() => {
          const instance = draftOrder[selectedInstanceId || ""];
          const addons =
            instance?.addon_ids?.map((i) => addonMap[i]).filter(Boolean) || [];
          const addonSelection = Object.fromEntries(
            instanceTemp?.addon_ids?.map((i) => [i, true]) || []
          );
          const { menuId: menuIdDebounced } = parseInstanceId(
            selectedInstanceIdDebounced || ""
          );
          const menuDebounced = menuMap[menuIdDebounced];

          return (
            <DrawerContent>
              <DrawerHandle />
              <div className="flex select-none flex-col overflow-y-scroll pb-5">
                <div className="flex flex-col">
                  <div className="mb-2 mt-2 flex w-full flex-row px-4">
                    <img
                      src={menuDebounced?.imgs?.find(Boolean)}
                      className="aspect-[1] h-12 w-12 rounded-sm object-cover"
                    />
                    <div className="ml-3 flex w-full flex-col overflow-hidden">
                      <span className="block truncate font-semibold">
                        {menuDebounced?.title}
                      </span>
                      {addons?.length ? (
                        <span className="mb-2 block w-fit whitespace-nowrap text-xs text-muted-foreground">
                          {addons.map((i) => i.title).join(", ")}
                        </span>
                      ) : (
                        <span className="mb-2 block w-fit truncate whitespace-nowrap text-xs text-muted-foreground">
                          {menuDebounced?.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {menuDebounced?.addon_groups?.map((i) => (
                    <Fragment key={i.id}>
                      <div className="flex w-full flex-col px-4">
                        <span className="mt-1 text-sm font-semibold">
                          {i.title}
                        </span>
                        <div className="w-full">
                          <div className="mb-1 w-full border-t border-zinc-100"></div>
                        </div>
                      </div>
                      {i.addons?.map((j) => (
                        <div
                          key={j.id}
                          className="flex shrink-0 flex-row items-center justify-between rounded-sm px-4 py-2 transition-colors hover:bg-zinc-50"
                          onClick={() => {
                            if (instanceTemp) {
                              const newSelection = toggleSelection(
                                j.id,
                                addonSelection
                              );
                              const selectedAddonIds = Object.keys(
                                newSelection
                              ).filter((key) => !!newSelection[key]);
                              setInstanceTemp({
                                ...instanceTemp,
                                addon_ids: selectedAddonIds
                              });
                            }
                          }}
                        >
                          <div className="flex w-full flex-col justify-start overflow-hidden">
                            <span className="block truncate whitespace-nowrap text-sm font-semibold">
                              {j.title}
                            </span>
                            <span className="block truncate whitespace-nowrap text-xs text-muted-foreground">
                              {j.description}
                            </span>
                            <span className="block whitespace-nowrap text-xs text-muted-foreground">
                              {formatPrice(j.price)}
                            </span>
                          </div>
                          <div className="flex w-10 flex-row justify-center">
                            {i.multiple_select ? (
                              <Checkbox
                                className="h-5 w-5 p-0"
                                checked={
                                  instanceTemp?.addon_ids?.includes(j.id) ||
                                  false
                                }
                              />
                            ) : (
                              <Input
                                type="radio"
                                className="h-5 w-5 p-0 accent-primary"
                                checked={
                                  instanceTemp?.addon_ids?.includes(j.id) ||
                                  false
                                }
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </Fragment>
                  ))}
                  <div className="mb-2 flex flex-col px-4">
                    <Textarea
                      placeholder="Catatan"
                      className="mt-3 normal-case"
                      maxLength={500}
                      value={instanceTemp?.notes}
                      onChange={(e) => {
                        if (instanceTemp) {
                          setInstanceTemp({
                            ...instanceTemp,
                            notes: e.target.value
                          });
                        }
                      }}
                    />
                    <div className="mt-3 flex flex-row">
                      <Button
                        className="mr-0 w-fit rounded-r-none border-r-0"
                        variant="outline"
                        onClick={() => {
                          if (instanceTemp && instanceTemp.qty > 0) {
                            setInstanceTemp({
                              ...instanceTemp,
                              qty: instanceTemp.qty - 1
                            });
                          }
                        }}
                        disabled={!instanceTemp?.qty}
                      >
                        -
                      </Button>
                      <Input
                        disabled
                        type={"number"}
                        className="mr-0 w-1/6 rounded-none text-center"
                        value={instanceTemp?.qty || 0}
                      />
                      <Button
                        className="mr-3 w-fit rounded-l-none border-l-0"
                        variant="outline"
                        onClick={() => {
                          if (instanceTemp) {
                            setInstanceTemp({
                              ...instanceTemp,
                              qty: (instanceTemp?.qty || 0) + 1
                            });
                          }
                        }}
                      >
                        +
                      </Button>
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => {
                          setSelectedMenuId(null);
                          setSelectedInstanceId(null);
                          setDraftOrder(
                            orderDraftReducer(draftOrder, {
                              type: "FLUSH_INSTANCE_TEMP",
                              data: {
                                instance_id: selectedInstanceId,
                                instance: instanceTemp
                              }
                            })
                          );
                          setInstanceTemp(null);
                        }}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DrawerContent>
          );
        })()}
      </Drawer>

      <Drawer
        open={!!selectedMenuId && menuMap[selectedMenuId]?.active}
        onOpenChange={(e) => {
          if (!e) {
            setSelectedMenuId(null);
            setSelectedInstanceId(null);
            setMenuTemp(null);
          }
        }}
        disablePreventScroll={true}
        handleOnly={true}
      >
        {(() => {
          const menu = menuMap[selectedMenuIdDebounced || ""];
          const addonSelection = Object.fromEntries(
            menuTemp?.addon_ids?.map((i) => [i, true]) || []
          );

          return (
            <DrawerContent>
              <DrawerHandle />
              <div className="flex flex-col overflow-y-scroll">
                <div className="flex flex-col px-4 pt-1">
                  <img
                    src={menu?.imgs?.find(Boolean)}
                    className="aspect-[4/3] max-h-[50svh] w-full rounded-sm object-cover"
                  />
                  <DrawerTitle className="mt-2 p-0 text-base font-semibold">
                    {menu?.title}
                  </DrawerTitle>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {menu?.description}
                  </span>
                  <span className="mb-2 block text-right text-sm text-muted-foreground">
                    {formatPrice(menu?.price)}
                  </span>
                </div>
                <div className="flex flex-col px-0 pb-4">
                  {menu?.addon_groups?.map((i) => (
                    <Fragment key={i.id}>
                      <div className="flex w-full flex-col px-4">
                        <span className="mt-1 text-sm font-semibold">
                          {i.title}
                        </span>
                        <div className="mb-1 w-full border-t border-zinc-100"></div>
                      </div>
                      {i.addons?.map((j) => (
                        <div
                          key={j.id}
                          className="flex shrink-0 flex-row items-center justify-between rounded-sm px-4 py-2 transition-colors hover:bg-zinc-50"
                          onClick={() => {
                            if (menuTemp && !order?.id) {
                              const newSelection = toggleSelection(
                                j.id,
                                addonSelection
                              );
                              const selectedAddonIds = Object.keys(
                                newSelection
                              ).filter(
                                (key) => newSelection[key]
                              ); /** DOESN'T MEAN I'D REMEMBER THIS */

                              setMenuTemp({
                                ...menuTemp,
                                addon_ids: selectedAddonIds
                              });
                            }
                          }}
                        >
                          <div className="flex w-full flex-col justify-start overflow-hidden">
                            <span className="block truncate whitespace-nowrap text-sm font-semibold">
                              {j.title}
                            </span>
                            <span className="block truncate whitespace-nowrap text-xs text-muted-foreground">
                              {j.description}
                            </span>
                            <span className="block whitespace-nowrap text-xs text-muted-foreground">
                              {formatPrice(j.price)}
                            </span>
                          </div>
                          <div className="flex w-10 flex-row justify-center">
                            {i.multiple_select ? (
                              <Checkbox
                                className="h-5 w-5 p-0"
                                checked={addonSelection[j.id] || false}
                                disabled={order?.id}
                              />
                            ) : (
                              <Input
                                type="radio"
                                className="h-5 w-5 p-0 accent-primary"
                                checked={addonSelection[j.id] || false}
                                disabled={order?.id}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </Fragment>
                  ))}
                  {menu?.addon_groups?.length && (
                    <div
                      className={cn(
                        "w-full flex-col px-3",
                        order?.id && "hidden"
                      )}
                    >
                      <div className="mt-2 flex w-full flex-row justify-between rounded-sm bg-secondary px-3 py-3 text-sm text-muted-foreground">
                        <span className="block">Harga</span>
                        <span className="block">
                          {formatPrice(
                            menuTemp?.addon_ids?.reduce(
                              (t, i) => {
                                return t + (Number(addonMap[i]?.price) || 0);
                              },
                              Number(menu?.price) || 0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "mb-2 mt-3 flex flex-row px-3",
                      order?.id && "hidden"
                    )}
                  >
                    <Button
                      className="mr-0 w-fit rounded-r-none border-r-0"
                      variant="outline"
                      onClick={() => {
                        if (menuTemp && menuTemp.qty && menuTemp.qty > 0) {
                          setMenuTemp({
                            ...menuTemp,
                            qty: menuTemp.qty - 1
                          });
                        }
                      }}
                      disabled={!menuTemp?.qty || order?.id}
                    >
                      -
                    </Button>
                    <Input
                      disabled
                      value={menuTemp?.qty || 0}
                      type={"number"}
                      className={cn(
                        `mx-0 w-1/6 rounded-none text-center`,
                        !menuTemp?.qty && "border-red-400"
                      )}
                    />
                    <Button
                      className="mr-3 w-fit rounded-l-none border-l-0"
                      variant="outline"
                      onClick={() => {
                        if (menuTemp) {
                          setMenuTemp({
                            ...menuTemp,
                            qty: (menuTemp?.qty || 0) + 1
                          });
                        }
                      }}
                      disabled={order?.id}
                    >
                      +
                    </Button>
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => {
                        if (menuTemp && selectedMenuId) {
                          setDraftOrder(
                            orderDraftReducer(draftOrder, {
                              type: "FLUSH_MENU_TEMP",
                              data: {
                                instance_id: createInstanceId(
                                  selectedMenuId,
                                  menuTemp.addon_ids
                                ),
                                instance: menuTemp
                              }
                            })
                          );
                        }
                        setSelectedMenuId(null);
                        setMenuTemp(null);
                      }}
                      disabled={!menuTemp?.qty || order?.id}
                    >
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>
            </DrawerContent>
          );
        })()}
      </Drawer>
    </div>
  );
}
