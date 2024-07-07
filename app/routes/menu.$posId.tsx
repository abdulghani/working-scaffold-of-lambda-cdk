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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Action } from "@/constants/action";
import { Element, RecordItem } from "@/constants/element";
import { formatPrice } from "@/lib/format-price";
import { parsePhone } from "@/lib/parse-phone";
import { useLocalStorageState } from "@/lib/use-localstorage-state";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useParams
} from "@remix-run/react";
import type { Menu } from "app/service/menu";
import { getMenuByPOS, getMenuCategoryPOS } from "app/service/menu";
import { validatePOSId } from "app/service/pos";
import { startCase } from "lodash-es";
import { Fragment, useMemo, useState } from "react";
import { useDebouncedMenu } from "./admin.$posId";
import {
  OrderDraftShape,
  orderDraftReducer
} from "./menu.$posId/order-draft-reducer";
import { createInstanceId, parseInstanceId } from "./menu.$posId/order-helper";

export async function loader({ params }: LoaderFunctionArgs) {
  const { posId } = params;
  const [pos, menus, menuCategories] = await Promise.all([
    validatePOSId?.(posId!),
    getMenuByPOS?.(posId!),
    getMenuCategoryPOS?.(posId!)
  ]);

  return { pos, menus, menuCategories };
}

export default function Menu() {
  const { posId } = useParams();
  const { pos, menus, menuCategories } = useLoaderData<typeof loader>();
  const action = useActionData<any>();

  /** DATA MEMOIZED FOR ACCESS */
  const [menuMap, addonGroupMap, addonMap] = useMemo(() => {
    const _menuMap = Object.fromEntries(menus?.map((i) => [i.id, i]) || []) as {
      [key: string]: Menu;
    };
    const _addonGroupMap = Object.fromEntries(
      menus?.flatMap((i) => i.addon_groups)?.map((i) => [i?.id, i]) || []
    ) as { [key: string]: Element<Menu["addon_groups"]> };
    const _addonMap = Object.fromEntries(
      menus
        ?.flatMap((i) => i.addon_groups?.flatMap((j) => j.addons))
        ?.map((i) => [i?.id, i]) || []
    ) as { [key: string]: Element<Element<Menu["addon_groups"]>["addons"]> };

    return [_menuMap, _addonGroupMap, _addonMap];
  }, [menus]);

  /** STATE RELATED */
  const [addonSelection, setAddonSelection] = useState<any>({});
  const [draftOrder, setDraftOrder] = useLocalStorageState<OrderDraftShape>(
    `order-draft-${posId}`,
    { pos_id: posId || "", instance_record_json: {} }
  );
  const [instanceTemp, setInstanceTemp] = useState<RecordItem<
    OrderDraftShape["instance_record_json"]
  > | null>(null);
  const [menuTemp, setMenuTemp] = useState<Partial<
    RecordItem<OrderDraftShape["instance_record_json"]>
  > | null>(null);

  /** REDUCER MANAGED STATE */
  function draftDispatch(action: Action) {
    const nextState = orderDraftReducer(draftOrder, action);
    setDraftOrder(nextState);
  }

  /** UI RELATED */
  const [filter, setFilter] = useState<any>(menuCategories?.find(Boolean)?.id);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null
  );

  /** STATE UTIL OPTIMIZATION, DEBOUNCED */
  const selectedMenuIdDebounced = useDebouncedMenu(selectedMenuId, 500);
  const selectedInstanceIdDebounced = useDebouncedMenu(selectedInstanceId, 500);
  const draftTotal = useMemo(() => {
    return Object.values(draftOrder.instance_record_json || {}).reduce(
      (t, instance) => {
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
      },
      0
    );
  }, [draftOrder, menuMap, addonMap]);

  /** MENU ADDON SELECTION, LOCAL TO STATE */
  function toggleSelection(addonId: string, selection: any) {
    const addon = addonMap[addonId];
    const addonGroup = addonGroupMap[addon?.addon_group_id];

    /** SET TOGGLE VALUE */
    const nextValue = !selection[addonId];
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

  function handleAddonToggle(addonId: string) {
    const selection = toggleSelection(addonId, structuredClone(addonSelection));
    setAddonSelection(selection);
  }

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
            onClick={() => draftDispatch({ type: "CLEAR_EMPTY" })}
          >
            Pesanan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="m-0 overflow-x-hidden p-0">
          <Card className="m-0 border-0 p-0 shadow-none">
            <CardHeader className="py-4">
              <div className="flex flex-row items-center">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={pos?.profile_img} />
                  <AvatarFallback>{pos?.name?.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="ml-3 flex flex-col overflow-hidden pr-4">
                  <CardTitle className="truncate">Menu {pos.name}</CardTitle>
                  <CardDescription className="truncate">
                    {pos.description || "Menu "}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="m-0 p-0">
              <div className="flex w-screen snap-x snap-mandatory flex-row overflow-x-scroll px-4 pb-3">
                {menus?.map((menu) => (
                  <Link
                    to="#"
                    className="mr-3 w-[42.5svh] shrink-0 snap-center lg:w-[320px]"
                    target="_self"
                    onClick={() => setSelectedMenuId(menu?.id)}
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
                      <span className="font-base ml-2 whitespace-nowrap text-sm text-muted-foreground">
                        {formatPrice(menu.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="flex w-screen snap-x snap-mandatory flex-row overflow-x-scroll px-4 pb-3">
                <Button
                  className="mr-3"
                  variant={filter === "all" ? "outline" : "secondary"}
                  onClick={() => setFilter("all")}
                  key={`menu-all`}
                >
                  {startCase("semua")}
                </Button>
                {menuCategories?.map((menu) => (
                  <Button
                    className="mr-3"
                    variant={filter === menu.id ? "outline" : "secondary"}
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
                      const menuAddonIds = (menu.addon_groups?.flatMap((i) =>
                        i.addons?.map((j) => j.id)
                      ) || []) as string[];
                      const selectedAddonIds = menuAddonIds.filter(
                        (key) => addonSelection[key || ""]
                      );
                      const instanceId = createInstanceId(
                        menu.id,
                        selectedAddonIds
                      );
                      setSelectedMenuId(menu?.id);
                      setMenuTemp(
                        draftOrder.instance_record_json?.[instanceId] || {
                          menu_id: menu.id,
                          qty: 0,
                          addon_ids: selectedAddonIds
                        }
                      );
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
          <div className="mt-2 flex flex-col px-5">
            {Object.entries(draftOrder.instance_record_json || {}).map(
              ([key, instance]) => {
                const { menu_id, notes, qty } = instance;
                const menu = menuMap[menu_id];
                const addons =
                  instance.addon_ids?.map((i) => addonMap[i]) || [];
                const currentPrice = addons.reduce(
                  (t, i) => t + Number(i.price),
                  Number(menu.price) || 0
                );

                if (!menu) return null;
                return (
                  <div
                    className="mt-3 flex flex-row"
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
              }
            )}
            {!Object.keys(draftOrder.instance_record_json || {}).length && (
              <Button className="mt-4" variant="ghost" disabled>
                Pesanan Anda masih kosong
              </Button>
            )}
            {Object.keys(draftOrder.instance_record_json || {}).length > 0 && (
              <>
                <div className="mt-4 flex flex-row justify-between rounded-sm bg-zinc-100 px-4 py-4 text-sm">
                  <span>Total</span>
                  <span className="text-muted-foreground">
                    {formatPrice(draftTotal)}
                  </span>
                </div>
                <Form method="post">
                  <div className="mt-3 space-y-1">
                    <Label htmlFor="name">
                      Atas nama{" "}
                      {action?.error?.details?.name && (
                        <span className="font-normal text-red-600">
                          ({action.error.details.name})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={draftOrder.name}
                      className={`capitalize ${action?.error?.details?.name && "border-red-400"}`}
                      placeholder="Nama Anda"
                      required
                      onChange={(e) =>
                        draftDispatch({
                          type: "SET_NAME",
                          data: e.target.value
                        })
                      }
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <Label htmlFor="phone">
                      No Handphone{" "}
                      {action?.error?.details?.phone && (
                        <span className="font-normal text-red-600">
                          ({action.error.details.phone})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="text"
                      autoComplete="tel"
                      min={8}
                      value={draftOrder.phone}
                      inputMode="numeric"
                      placeholder="No Handphone Anda"
                      className={`${action?.error?.details?.phone && "border-red-400"}`}
                      onChange={(e) =>
                        draftDispatch({
                          type: "SET_PHONE",
                          data: parsePhone(e.target.value)
                        })
                      }
                    />
                  </div>
                  <Button
                    className="mt-5 w-full"
                    variant="default"
                    type="submit"
                    disabled
                  >
                    Buat pesanan
                  </Button>
                </Form>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Drawer
        open={!!selectedInstanceId}
        onOpenChange={(e) => {
          if (!e) {
            setSelectedMenuId(null);
            setSelectedInstanceId(null);
            setInstanceTemp(null);
            draftDispatch({ type: "CLEAR_EMPTY" });
          }
        }}
        disablePreventScroll={true}
        handleOnly={true}
      >
        {(() => {
          const instance =
            draftOrder.instance_record_json?.[selectedInstanceId || ""];
          const selectedAddons =
            instance?.addon_ids?.map((i) => addonMap[i]) || [];
          const addonSelection = Object.fromEntries(
            instance?.addon_ids?.map((i) => [i, true]) || []
          );
          const { menuId: menuIdDebounced } = parseInstanceId(
            selectedInstanceIdDebounced || ""
          );
          const menuDebounced = menuMap[menuIdDebounced];

          return (
            <DrawerContent>
              <DrawerHandle />
              <div className="flex select-none flex-col overflow-y-scroll px-4 pb-5">
                <div className="flex flex-col px-1">
                  <div className="mb-2 mt-2 flex w-full flex-row">
                    <img
                      src={menuDebounced?.imgs?.find(Boolean)}
                      className="aspect-[1] h-12 w-12 rounded-sm object-cover"
                    />
                    <div className="ml-3 flex w-full flex-col overflow-hidden">
                      <span className="block truncate font-semibold">
                        {menuDebounced?.title}
                      </span>
                      {selectedAddons?.length ? (
                        <span className="mb-2 block w-fit whitespace-nowrap text-xs text-muted-foreground">
                          {selectedAddons.map((i) => i.title).join(", ")}
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
                      <span className="mt-1 text-sm font-semibold">
                        {i.title}
                      </span>
                      <div className="w-full">
                        <div className="mb-1 w-full border-t border-zinc-100"></div>
                      </div>
                      {i.addons?.map((j) => (
                        <div
                          key={j.id}
                          className="flex shrink-0 flex-row items-center justify-between py-2 transition-colors hover:bg-zinc-50"
                          onClick={() => {
                            if (instanceTemp) {
                              const newSelection = toggleSelection(
                                j.id,
                                addonSelection
                              );
                              const selectedAddonIds = Object.keys(
                                newSelection
                              ).filter((key) => newSelection[key]);
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
                          <Checkbox
                            className="mr-2"
                            checked={
                              instanceTemp?.addon_ids?.includes(j.id) || false
                            }
                          />
                        </div>
                      ))}
                    </Fragment>
                  ))}
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
                        draftDispatch({
                          type: "FLUSH_INSTANCE_TEMP",
                          data: {
                            instance_id: selectedInstanceId,
                            instance: instanceTemp
                          }
                        });
                        setInstanceTemp(null);
                      }}
                    >
                      Simpan
                    </Button>
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
          const selectedAddonIds = menuTemp?.addon_ids || [];
          const instanceId = createInstanceId(
            selectedMenuId || "",
            selectedAddonIds
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
                </div>

                <div className="flex flex-col px-4 pb-4">
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {menu?.description}
                  </span>
                  <span className="mb-2 block text-right text-sm text-muted-foreground">
                    {formatPrice(menu?.price)}
                  </span>
                  {menu?.addon_groups?.map((i) => (
                    <Fragment key={i.id}>
                      <span className="mt-1 text-sm font-semibold">
                        {i.title}
                      </span>
                      <div className="w-full">
                        <div className="mb-1 w-full border-t border-zinc-100"></div>
                      </div>
                      {i.addons?.map((j) => (
                        <div
                          key={j.id}
                          className="flex shrink-0 flex-row items-center justify-between py-2 transition-colors hover:bg-zinc-50"
                          onClick={() => {
                            if (menuTemp) {
                              const newSelection = toggleSelection(
                                j.id,
                                addonSelection
                              );
                              const selectedAddonIds = Object.keys(
                                newSelection
                              ).filter(
                                (key) => newSelection[key]
                              ); /** DOESN'T MEAN I'D REMEMBER THIS */
                              const newInstanceId = createInstanceId(
                                selectedMenuId || "",
                                selectedAddonIds
                              );

                              setMenuTemp({
                                ...menuTemp,
                                qty:
                                  draftOrder.instance_record_json?.[
                                    newInstanceId
                                  ]?.qty || 0,
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
                          <Checkbox
                            className="mr-2"
                            checked={addonSelection[j.id] || false}
                          />
                        </div>
                      ))}
                    </Fragment>
                  ))}

                  <div className="mt-2">
                    <div className="mt-3 flex flex-row">
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
                      >
                        -
                      </Button>
                      <Input
                        disabled
                        value={menuTemp?.qty || 0}
                        type={"number"}
                        className="mx-0 w-1/6 rounded-none text-center"
                      />
                      <Button
                        className="mr-3 w-1/4 rounded-l-none border-l-0"
                        variant="outline"
                        onClick={() => {
                          if (menuTemp) {
                            setMenuTemp({
                              ...menuTemp,
                              qty: (menuTemp?.qty || 0) + 1
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
                          if (menuTemp && selectedMenuId) {
                            draftDispatch({
                              type: "FLUSH_INSTANCE_TEMP",
                              data: {
                                instance_id: createInstanceId(
                                  selectedMenuId,
                                  menuTemp.addon_ids
                                ),
                                instance: menuTemp
                              }
                            });
                          }
                          setSelectedMenuId(null);
                          setMenuTemp(null);
                        }}
                        disabled={!menuTemp?.qty}
                      >
                        Tambah
                      </Button>
                    </div>
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
