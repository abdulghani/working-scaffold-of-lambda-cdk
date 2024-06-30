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
import { useLocalStorageState } from "@/lib/use-localstorage-state";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { validatePOSId } from "app/service/pos";
import { startCase } from "lodash-es";
import { useState } from "react";

const MENU_STATIC = [
  {
    id: 1,
    name: "Menu 1",
    price: 2000000,
    img: "https://images.unsplash.com/photo-1604999565976-8913ad2ddb7c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=320&h=160&q=80",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam repudiandae distinctio provident similique veritatis iusto voluptatum perspiciatis eligendi commodi ab.",
    category: ["drinks", "main"]
  },
  {
    id: 2,
    name: "Menu 2",
    price: 2500000,
    img: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=320&h=160&q=80",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam repudiandae distinctio provident similique veritatis iusto voluptatum perspiciatis eligendi commodi ab.",
    category: ["main", "drink", "sharing"]
  },
  {
    id: 3,
    name: "Menu 3",
    price: 1500000,
    img: "https://images.unsplash.com/photo-1622890806166-111d7f6c7c97?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=320&h=160&q=80",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam repudiandae distinctio provident similique veritatis iusto voluptatum perspiciatis eligendi commodi ab.",
    category: ["sharing", "main", "desert"]
  },
  {
    id: 4,
    name: "Menu 4",
    price: 1500000,
    img: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=320&h=160&q=80",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam repudiandae distinctio provident similique veritatis iusto voluptatum perspiciatis eligendi commodi ab.",
    category: ["desert", "sharing"]
  },
  {
    id: 5,
    name: "Menu 5",
    price: 1500000,
    img: "https://images.unsplash.com/photo-1575424909138-46b05e5919ec?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=320&h=160&q=80",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam repudiandae distinctio provident similique veritatis iusto voluptatum perspiciatis eligendi commodi ab.",
    category: ["condiments"]
  },
  {
    id: 6,
    name: "Menu 6",
    price: 1500000,
    img: "https://images.unsplash.com/photo-1559333086-b0a56225a93c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=320&h=160&q=80",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Veniam repudiandae distinctio provident similique veritatis iusto voluptatum perspiciatis eligendi commodi ab.",
    category: ["drinks"]
  }
];

const MENU = ["main", "drinks", "sharing", "desert", "condiments"];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const [pos] = await Promise.all([validatePOSId?.(params.posId!)]);

  return { pos };
}

export default function Menu() {
  const { pos } = useLoaderData<any>();
  const [filter, setFilter] = useState<any>(MENU[0]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [draft, setDraft] = useLocalStorageState("draft", {});
  const action = useActionData<any>();

  function updateDraft(key: any, action: "INCREMENT" | "DECREMENT") {
    const current = draft[String(key)] || 0;
    const next = action === "INCREMENT" ? current + 1 : current - 1;

    setDraft((prev: any) => {
      if (next <= 0) {
        delete prev[String(key)];
        return { ...prev };
      }
      return {
        ...prev,
        [String(key)]: next
      };
    });
  }

  function clearOutEmpty() {
    setDraft((prev: any) => {
      return Object.fromEntries(
        Object.entries(prev).filter(([_, v]: any) => Number(v) > 0)
      );
    });
  }

  return (
    <>
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
        <TabsContent value="menu" className="m-0 p-0">
          <Card className="m-0 border-0 p-0 shadow-none">
            <CardHeader>
              <div className="flex flex-row items-center">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={pos?.profile_img} />
                  <AvatarFallback>{pos?.name?.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <CardTitle>Menu {pos.name}</CardTitle>
                  <CardDescription>
                    {pos.description || "Menu "}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="m-0 p-0">
              <div className="flex w-screen snap-x snap-mandatory flex-row overflow-x-scroll px-4 pb-3">
                {MENU_STATIC.map((menu) => (
                  <Link
                    to="#"
                    className="mr-3 shrink-0 snap-center"
                    target="_self"
                    onClick={() => setSelectedMenu(menu)}
                    key={`carousel-${menu.id}`}
                  >
                    <img
                      className="aspect-[5/3] w-full rounded-md object-cover"
                      src={menu.img}
                    />
                    <div className="flex flex-row justify-between">
                      <span className="font-base ml-0.5 mt-1.5 block text-sm text-muted-foreground">
                        {menu.name}
                      </span>
                      <span className="font-base ml-0.5 mt-1.5 block text-sm text-muted-foreground">
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
                {MENU.map((menu) => (
                  <Button
                    className="mr-3"
                    variant={filter === menu ? "outline" : "secondary"}
                    onClick={() => setFilter(menu)}
                    key={`menu-${menu}`}
                  >
                    {startCase(menu)}
                  </Button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 px-4">
                {(() => {
                  if (filter && filter !== "all") {
                    return MENU_STATIC.filter((menu) =>
                      menu.category.includes(filter)
                    );
                  }
                  return MENU_STATIC;
                })().map((menu) => (
                  <Link
                    to="#"
                    className="shrink-0 snap-center"
                    target="_self"
                    key={`list-${menu.id}`}
                  >
                    <img
                      className="aspect-[4/3] w-full rounded-md object-cover"
                      src={menu.img}
                      onClick={() => setSelectedMenu(menu)}
                    />
                    <div className="flex flex-row justify-between">
                      <span className="font-base ml-0.5 mt-1.5 block text-sm text-muted-foreground">
                        {menu.name}
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
            {Object.entries(draft).map(([key, qty]) => {
              const menu = MENU_STATIC.find((menu) => String(menu.id) === key);
              if (!menu) return null;
              return (
                <div className="mt-3 flex flex-row" key={`draft-${menu.id}`}>
                  <img
                    src={menu.img}
                    className="aspect-[1] h-16 w-16 rounded-sm object-cover"
                  />
                  <div className="ml-3 flex flex-col">
                    <span className="block font-semibold">{menu.name}</span>
                    <span className="block text-ellipsis text-sm text-muted-foreground">
                      {menu.description.substring(0, 50)}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={Number(qty)}
                      className="w-12 text-center"
                      onChange={(e) =>
                        setDraft((prev: any) => ({
                          ...prev,
                          [key]: Number(e.target.value)
                        }))
                      }
                      onBlur={() => clearOutEmpty()}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(draft).length === 0 && (
              <Button className="mt-4" variant="ghost" disabled>
                Pesanan Anda masih kosong
              </Button>
            )}
            {Object.keys(draft).length > 0 && (
              <>
                <div className="mt-4 flex flex-row justify-between rounded-sm bg-zinc-100 px-4 py-4 text-sm">
                  <span>Total</span>
                  <span>
                    {formatPrice(
                      Object.keys(draft).reduce(
                        (total, key) =>
                          total +
                          (MENU_STATIC.find((i) => String(i.id) === key)
                            ?.price || 0) *
                            (draft[key] >= 0 ? draft[key] : 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <Form method="post">
                  <div className="mt-3 space-y-1">
                    <Label htmlFor="name">
                      Nama{" "}
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
                          ({action.error.details.phone})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="text"
                      min={8}
                      inputMode="numeric"
                      placeholder="No Handphone Anda"
                      className={`${action?.error?.details?.phone && "border-red-400"}`}
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

      {selectedMenu?.id && (
        <Drawer
          open={selectedMenu?.id}
          onOpenChange={(e) => !e && setSelectedMenu(null)}
          disablePreventScroll={true}
        >
          <DrawerContent className="rounded-t-sm p-0">
            <DrawerHeader className="p-0 px-4 pt-5 text-left">
              <img
                src={selectedMenu?.img}
                className="aspect-[4/3] w-full rounded-sm object-cover"
              />
              <DrawerTitle className="mt-2 p-0 text-base font-semibold">
                {selectedMenu?.name}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex select-none flex-col px-4 pb-5">
              <div className="flex flex-col px-1">
                <span className="mt-2 block text-sm text-muted-foreground">
                  {selectedMenu?.description}
                </span>
                <span className="block text-right text-sm">
                  {formatPrice(selectedMenu?.price)}
                </span>
                <div className="mt-5 flex flex-row">
                  <Button
                    className="mr-3 w-1/6"
                    variant="outline"
                    onClick={() => updateDraft(selectedMenu?.id, "DECREMENT")}
                  >
                    -
                  </Button>
                  <Input
                    disabled
                    value={draft[selectedMenu?.id] || 0}
                    type={"number"}
                    className="mr-3 w-1/6 text-center"
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
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
