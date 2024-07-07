import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/format-price";
import { parsePhone } from "@/lib/parse-phone";
import { Form } from "@remix-run/react";
import { Menu } from "app/service/menu";
import { OrderDraftShape } from "./order-draft-reducer";

export default function OrderTab({
  value,
  orderDraft,
  menus,
  orderDispatch,
  setSelectedOrderInstance,
  action
}: {
  value: string;
  orderDraft: OrderDraftShape;
  menus?: Menu[];
  orderDispatch: any;
  setSelectedOrderInstance: any;
  action: any;
}) {
  return (
    <TabsContent value={value} className="m-0 p-0">
      <div className="mt-2 flex flex-col px-5">
        {Object.values(orderDraft.instance_record_json || {}).map((order) => {
          const { menu_id, instances } = order;
          const menu = menus?.find((menu) => menu.id === menu_id);
          const menuAddons = menu?.addon_groups?.flatMap(
            (group) => group.addons
          );
          return (
            menu &&
            Object.values(instances || {}).map((instance) => {
              const { qty, addon_ids, notes } = instance;
              const addons = addon_ids
                ?.map((id) => menuAddons?.find((addon) => addon?.id === id))
                .filter(Boolean);
              const currentPrice = addons?.reduce(
                (total, addon) => {
                  if (!addon?.price) return total;
                  return total + Number(addon.price);
                },
                Number(menu.price || 0)
              );

              return (
                <div
                  className="mt-3 flex flex-row"
                  key={`draft-${menu.id}`}
                  onClick={() => setSelectedOrderInstance([menu.id])}
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
                        {addons && (
                          <span className="block truncate text-sm text-muted-foreground">
                            {addons?.map((addon) => addon?.title).join(", ")}
                          </span>
                        )}
                        <span className="block truncate text-sm text-muted-foreground">
                          {notes ? `Catatan: ${notes}` : menu.description}
                        </span>
                      </div>
                      <span className="block text-xs text-muted-foreground">
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
            })
          );
        })}
        {Object.keys(orderDraft.instance_record_json || {}).length === 0 && (
          <Button className="mt-4" variant="ghost" disabled>
            Pesanan Anda masih kosong
          </Button>
        )}
        {Object.keys(orderDraft.instance_record_json || {}).length > 0 && (
          <>
            <div className="mt-4 flex flex-row justify-between rounded-sm bg-zinc-100 px-4 py-4 text-sm">
              <span>Total</span>
              <span className="text-muted-foreground">
                {/* {formatPrice(
                      Object.keys(orderDraft?.menu_record_json).reduce(
                        (total, key) =>
                          total +
                          (menus?.find((i) => i.id === key)?.price || 0) *
                            (orderDraft?.menu_record_json[key]?.qty >= 0
                              ? orderDraft?.menu_record_json[key]?.qty
                              : 0),
                        0
                      )
                    )} */}
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
                  value={orderDraft.name}
                  className={`capitalize ${action?.error?.details?.name && "border-red-400"}`}
                  placeholder="Nama Anda"
                  required
                  onChange={(e) =>
                    orderDispatch({
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
                  value={orderDraft.phone}
                  inputMode="numeric"
                  placeholder="No Handphone Anda"
                  className={`${action?.error?.details?.phone && "border-red-400"}`}
                  onChange={(e) =>
                    orderDispatch({
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
  );
}
