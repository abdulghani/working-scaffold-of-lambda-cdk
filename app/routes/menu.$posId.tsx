import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/format-price";
import { parsePhone } from "@/lib/parse-phone";
import { useLocalStorageState } from "@/lib/use-localstorage-state";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { getMenuByPOS, getMenuCategoryPOS } from "app/service/menu";
import { validatePOSId } from "app/service/pos";
import { startCase } from "lodash-es";
import { useState } from "react";

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
  const { pos, menus, menuCategories } = useLoaderData<any>();
  const [filter, setFilter] = useState<any>(menuCategories?.find(Boolean)?.id);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [selectedMenuOrder, setSelectedMenuOrder] = useState<any>(null);
  const [draftOrder, setDraftOrder] = useLocalStorageState("order-draft", {
    order: {}
  });
  const action = useActionData<any>();

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
          <TabsTrigger className="w-1/2" value="menu">
            Menu
          </TabsTrigger>
          <TabsTrigger
            className="w-1/2"
            value="order"
            onClick={() => clearOutEmpty()}
          >
            Pesanan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="m-0 overflow-x-hidden p-0">
          <Card className="m-0 border-0 p-0 shadow-none">
            <CardHeader>
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
                    onClick={() => setSelectedMenu(menu)}
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
                      onClick={() => setSelectedMenu(menu)}
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
                    onClick={() => setSelectedMenuOrder(menu)}
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

      {selectedMenuOrder?.id && (
        <Drawer
          open={selectedMenuOrder?.id}
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
                    src={selectedMenuOrder?.imgs?.find(Boolean)}
                    className="aspect-[1] h-[4.25rem] w-[4.25rem] rounded-sm object-cover"
                  />
                  <div className="ml-3 flex w-full flex-col justify-between overflow-hidden">
                    <div className="flex flex-row justify-between overflow-hidden">
                      <span className="block truncate font-semibold">
                        {selectedMenuOrder?.title}
                      </span>
                      <span className="ml-4 block w-fit whitespace-nowrap text-right text-sm text-muted-foreground">
                        {formatPrice(selectedMenuOrder?.price)}
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="Catatan"
                      className="normal-case"
                      value={
                        draftOrder.order[String(selectedMenuOrder?.id)]?.notes
                      }
                      onChange={(e) =>
                        setDraftOrder((prev: any) => {
                          prev.order[String(selectedMenuOrder?.id)].notes =
                            e.target.value;
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
                        updateDraft(selectedMenuOrder?.id, "DECREMENT")
                      }
                    >
                      -
                    </Button>
                    <Input
                      disabled
                      value={draftOrder.order[selectedMenuOrder?.id]?.qty || 0}
                      type={"number"}
                      className="mr-0 w-1/6 rounded-none text-center"
                    />
                    <Button
                      className="mr-3 w-fit rounded-l-none border-l-0"
                      variant="outline"
                      onClick={() =>
                        updateDraft(selectedMenuOrder?.id, "INCREMENT")
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
      )}

      {selectedMenu?.id && (
        <Drawer
          open={selectedMenu?.id}
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
            <DrawerHeader className="p-0 px-4 pt-5 text-left">
              <img
                src={selectedMenu?.imgs?.find(Boolean)}
                className="aspect-[4/3] max-h-[50svh] w-full rounded-sm object-cover"
              />
              <DrawerTitle className="mt-2 p-0 text-base font-semibold">
                {selectedMenu?.title}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex select-none flex-col px-4 pb-5">
              <div className="flex flex-col px-1">
                <span className="mt-2 block text-sm text-muted-foreground">
                  {selectedMenu?.description}
                </span>
                <span className="block text-right text-sm text-muted-foreground">
                  {formatPrice(selectedMenu?.price)}
                </span>
                <div className="mt-2">
                  <div className="mt-3 flex flex-row">
                    <Button
                      className="mr-0 w-fit rounded-r-none border-r-0"
                      variant="outline"
                      onClick={() => updateDraft(selectedMenu?.id, "DECREMENT")}
                    >
                      -
                    </Button>
                    <Input
                      disabled
                      value={draftOrder.order[selectedMenu?.id]?.qty || 0}
                      type={"number"}
                      className="mr-3 w-1/6 rounded-l-none text-center"
                    />
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => updateDraft(selectedMenu?.id, "INCREMENT")}
                    >
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
