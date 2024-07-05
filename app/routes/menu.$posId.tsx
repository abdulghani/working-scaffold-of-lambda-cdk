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
import { formatPrice } from "@/lib/format-price";
import { parsePhone } from "@/lib/parse-phone";
import { useLocalStorageState } from "@/lib/use-localstorage-state";
import { useRevalidation } from "@/lib/use-revalidation";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { getMenuByPOS, getMenuCategoryPOS } from "app/service/menu";
import { validatePOSId } from "app/service/pos";
import { startCase } from "lodash-es";
import { Fragment, useMemo, useState } from "react";
import { useDebouncedMenu } from "./admin.$posId";

export async function loader({ params }: LoaderFunctionArgs) {
  const { posId } = params;
  const [pos, menus, menuCategories] = await Promise.all([
    validatePOSId?.(posId!),
    getMenuByPOS?.(posId!),
    getMenuCategoryPOS?.(posId!)
  ]);

  return { pos, menus, menuCategories };
}

function orderDraftReducer(state: any, action: any) {
  switch (action.type) {
    default: {
      return {
        ...state
      };
    }
  }
}

export default function Menu() {
  const { pos, menus, menuCategories } = useLoaderData<any>();
  const [filter, setFilter] = useState<any>(menuCategories?.find(Boolean)?.id);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [selectedMenuOrder, setSelectedMenuOrder] = useState<string | null>(
    null
  );
  const currentSelectedMenu = useMemo(
    () => menus?.find((i) => i.id === selectedMenu),
    [selectedMenu, menus]
  );
  const debouncedSelectedMenu = useDebouncedMenu(currentSelectedMenu, 500);
  const currentSelectedMenuOrder = useMemo(
    () => menus?.find((i) => i.id === selectedMenuOrder),
    [selectedMenuOrder, menus]
  );
  const debouncedSelectedMenuOrder = useDebouncedMenu(
    currentSelectedMenuOrder,
    500
  );
  const [draftOrder, setDraftOrder] = useLocalStorageState("order-draft", {
    order: {}
  });
  const action = useActionData<any>();
  const [menuAddonSelection, setMenuAddonSelection] = useState<any>({});

  useRevalidation();

  function updateDraft(key: any, action: "INCREMENT" | "DECREMENT") {
    const current = draftOrder.order[String(key)]?.qty || 0;
    const next = action === "INCREMENT" ? current + 1 : current - 1;

    setDraftOrder((prev: any) => {
      if (!prev.order[String(key)]) {
        prev.order[String(key)] = {};
      }
      prev.order[String(key)].qty = next <= 0 ? 0 : next;

      return {
        ...prev,
        order: {
          ...prev.order
        }
      };
    });
  }

  function handleToggleMenuSelection(options: {
    menuId: string;
    addonGroupId: string;
    addonId: string;
  }) {
    const { menuId, addonGroupId, addonId } = options;
    const selection = structuredClone(menuAddonSelection);
    if (!selection[menuId]) {
      selection[menuId] = {};
    }
    const nextValue = !selection[menuId][addonId];
    const addonGroup = menus
      .find((i) => i.id === menuId)
      ?.addon_groups?.find((i) => i.id === addonGroupId);
    if (addonGroup && !addonGroup?.multiple_select && nextValue) {
      addonGroup?.addons?.forEach((i) => {
        selection[menuId][i.id] = !nextValue;
      });
    }
    selection[menuId][addonId] = !selection[menuId][addonId];
    setMenuAddonSelection(selection);
  }

  function clearOutEmpty() {
    setDraftOrder((prev: any) => {
      return {
        ...prev,
        order: {
          ...Object.fromEntries(
            Object.entries(prev.order).filter(
              ([_, v]: any) => Number(v?.qty) > 0
            )
          )
        }
      };
    });
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
            onClick={() => clearOutEmpty()}
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
                {menus.map((menu) => (
                  <Link
                    to="#"
                    className="mr-3 w-[42.5svh] shrink-0 snap-center lg:w-[320px]"
                    target="_self"
                    onClick={() => setSelectedMenu(menu?.id)}
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
                {menuCategories.map((menu) => (
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
                    return menus.filter((menu) =>
                      menu.categories.includes(filter)
                    );
                  }
                  return menus;
                })().map((menu) => (
                  <Link
                    to="#"
                    className="shrink-0 snap-center"
                    target="_self"
                    key={`list-${menu.id}`}
                  >
                    <img
                      className="aspect-[4/3] w-full rounded-md object-cover"
                      src={menu.imgs?.find(Boolean)}
                      onClick={() => setSelectedMenu(menu?.id)}
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
            {Object.entries(draftOrder.order).map(
              ([key, order]: [string, any]) => {
                const { qty, notes } = order;
                const menu = menus.find((menu) => menu.id === key);
                if (!menu) return null;
                return (
                  <div
                    className="mt-3 flex flex-row"
                    key={`draft-${menu.id}`}
                    onClick={() => setSelectedMenuOrder(menu?.id)}
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
                          <span className="block truncate text-sm text-muted-foreground">
                            {notes ? `Catatan: ${notes}` : menu.description}
                          </span>
                        </div>
                        <span className="block text-xs text-muted-foreground">
                          {formatPrice(menu.price)}
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
            {Object.keys(draftOrder.order).length === 0 && (
              <Button className="mt-4" variant="ghost" disabled>
                Pesanan Anda masih kosong
              </Button>
            )}
            {Object.keys(draftOrder.order).length > 0 && (
              <>
                <div className="mt-4 flex flex-row justify-between rounded-sm bg-zinc-100 px-4 py-4 text-sm">
                  <span>Total</span>
                  <span className="text-muted-foreground">
                    {formatPrice(
                      Object.keys(draftOrder.order).reduce(
                        (total, key) =>
                          total +
                          (menus.find((i) => i.id === key)?.price || 0) *
                            (draftOrder.order[key]?.qty >= 0
                              ? draftOrder.order[key]?.qty
                              : 0),
                        0
                      )
                    )}
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
                        setDraftOrder((prev: any) => ({
                          ...prev,
                          name: e.target.value
                        }))
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
                        setDraftOrder((prev: any) => ({
                          ...prev,
                          phone: parsePhone(e.target.value)
                        }))
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
        open={!!selectedMenuOrder && currentSelectedMenuOrder?.active}
        onOpenChange={(e) => {
          if (!e) {
            setSelectedMenu(null);
            setSelectedMenuOrder(null);
            clearOutEmpty();
          }
        }}
        disablePreventScroll={true}
      >
        <DrawerContent className="rounded-t-sm p-0">
          <div className="flex select-none flex-col px-4 pb-5">
            <div className="flex flex-col px-1">
              <div className="mt-4 flex w-full flex-row">
                <img
                  src={debouncedSelectedMenuOrder?.imgs?.find(Boolean)}
                  className="aspect-[1] h-[4.25rem] w-[4.25rem] rounded-sm object-cover"
                />
                <div className="ml-3 flex w-full flex-col justify-between overflow-hidden">
                  <div className="flex flex-row justify-between overflow-hidden">
                    <span className="block truncate font-semibold">
                      {debouncedSelectedMenuOrder?.title}
                    </span>
                    <span className="ml-4 block w-fit whitespace-nowrap text-right text-sm text-muted-foreground">
                      {formatPrice(debouncedSelectedMenuOrder?.price)}
                    </span>
                  </div>
                  <Input
                    type="text"
                    placeholder="Catatan"
                    className="normal-case"
                    value={
                      draftOrder.order[String(debouncedSelectedMenuOrder?.id)]
                        ?.notes
                    }
                    onChange={(e) =>
                      setDraftOrder((prev: any) => {
                        prev.order[
                          String(debouncedSelectedMenuOrder?.id)
                        ].notes = e.target.value;
                        return {
                          ...prev,
                          order: {
                            ...prev.order
                          }
                        };
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-2">
                <div className="mt-3 flex flex-row">
                  <Button
                    className="mr-0 w-fit rounded-r-none border-r-0"
                    variant="outline"
                    onClick={() =>
                      updateDraft(debouncedSelectedMenuOrder?.id, "DECREMENT")
                    }
                  >
                    -
                  </Button>
                  <Input
                    disabled
                    value={
                      draftOrder.order[debouncedSelectedMenuOrder?.id]?.qty || 0
                    }
                    type={"number"}
                    className="mr-0 w-1/6 rounded-none text-center"
                  />
                  <Button
                    className="mr-3 w-fit rounded-l-none border-l-0"
                    variant="outline"
                    onClick={() =>
                      updateDraft(debouncedSelectedMenuOrder?.id, "INCREMENT")
                    }
                  >
                    +
                  </Button>
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => {
                      setSelectedMenuOrder(null);
                      clearOutEmpty();
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={!!selectedMenu && currentSelectedMenu?.active}
        onOpenChange={(e) => {
          if (!e) {
            setSelectedMenu(null);
            setSelectedMenuOrder(null);
            clearOutEmpty();
          }
        }}
        disablePreventScroll={true}
      >
        <DrawerContent className="rounded-t-sm p-0">
          <DrawerHandle />
          <div className="flex max-h-[80svh] flex-col overflow-y-scroll">
            <div className="flex flex-col px-4 pt-1">
              <img
                src={debouncedSelectedMenu?.imgs?.find(Boolean)}
                className="aspect-[4/3] max-h-[50svh] w-full rounded-sm object-cover"
              />
              <DrawerTitle className="mt-2 p-0 text-base font-semibold">
                {debouncedSelectedMenu?.title}
              </DrawerTitle>
            </div>

            <div className="flex flex-col px-4 pb-4">
              <span className="mt-2 block text-sm text-muted-foreground">
                {debouncedSelectedMenu?.description}
              </span>
              <span className="mb-2 block text-right text-sm text-muted-foreground">
                {formatPrice(debouncedSelectedMenu?.price)}
              </span>
              {debouncedSelectedMenu?.addon_groups?.map((i: any) => (
                <Fragment key={i.id}>
                  <span className="mt-1 text-sm font-semibold">{i.title}</span>
                  <div className="w-full">
                    <div className="mb-1 w-full border-t border-zinc-100"></div>
                  </div>
                  {i.addons?.map((j: any) => (
                    <div
                      key={j.id}
                      className="flex shrink-0 flex-row items-center justify-between py-2 transition-colors hover:bg-zinc-50"
                      onClick={() => {
                        handleToggleMenuSelection({
                          menuId: debouncedSelectedMenu?.id,
                          addonGroupId: i?.id,
                          addonId: j?.id
                        });
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
                          menuAddonSelection[debouncedSelectedMenu?.id]?.[
                            j.id
                          ] || false
                        }
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
                    onClick={() =>
                      updateDraft(debouncedSelectedMenu?.id, "DECREMENT")
                    }
                  >
                    -
                  </Button>
                  <Input
                    disabled
                    value={
                      draftOrder.order[debouncedSelectedMenu?.id]?.qty || 0
                    }
                    type={"number"}
                    className="mr-3 w-1/6 rounded-l-none text-center"
                  />
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() =>
                      updateDraft(debouncedSelectedMenu?.id, "INCREMENT")
                    }
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
