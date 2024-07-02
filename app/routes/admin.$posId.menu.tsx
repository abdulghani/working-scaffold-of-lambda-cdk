import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { TabsContent } from "@radix-ui/react-tabs";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getAdminMenuByPOS, getMenuCategoryPOS } from "app/service/menu";
import { validatePOSId } from "app/service/pos";
import { ClipboardList, Ellipsis, FileClock } from "lucide-react";
import { useMemo, useState } from "react";

export async function loader({ params }: LoaderFunctionArgs) {
  const { posId } = params;
  const [pos, menus, menuCategories] = await Promise.all([
    validatePOSId?.(posId!),
    getAdminMenuByPOS?.(posId!),
    getMenuCategoryPOS?.(posId!)
  ]);

  menuCategories?.forEach((i, key) => {
    const _menus = menus?.filter((j) => j.categories?.includes(i.id));
    menuCategories[key].count = _menus?.length;
  });

  return { pos, menus, menuCategories };
}

export default function AdminMenu() {
  const { pos, menus, menuCategories } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState("all");
  const [filteredActive, filteredInactive] = useMemo(() => {
    const filtered =
      filter === "all"
        ? menus
        : menus?.filter((i) => i.categories?.includes(filter));

    return filtered?.reduce(
      ([active, inactive], i) => {
        if (i.active) return [active.concat(i), inactive];
        return [active, inactive.concat(i)];
      },
      [[], []]
    );
  }, [menus, filter]);
  const menuFilter = useMemo(() => {
    return [{ id: "all", title: "Semua" }, ...(menuCategories ?? [])];
  }, [menuCategories]);

  return (
    <div className="flex w-full flex-col overflow-x-hidden">
      {menuFilter.length && (
        <div className="mt-2 flex w-screen snap-x snap-mandatory flex-row overflow-x-scroll px-4 pb-2">
          {menuFilter.map((menu) => (
            <Button
              className={cn(
                "mr-2 border-zinc-100 text-xs hover:border hover:bg-white",
                filter !== menu.id && "text-muted-foreground"
              )}
              variant={filter === menu.id ? "outline" : "secondary"}
              onClick={() => setFilter(menu.id)}
              key={`menu-${menu.id}`}
            >
              {menu.title} ({menu.id === "all" ? menus?.length : menu.count})
            </Button>
          ))}
        </div>
      )}
      <Tabs
        defaultValue="active"
        className="w-full overflow-x-hidden lg:w-[400px]"
      >
        <TabsList className="mx-3 mb-2 grid h-fit grid-cols-2">
          <TabsTrigger value="active" className="text-xs">
            <ClipboardList className="mr-2 w-4" />
            Aktif ({filteredActive?.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="text-xs">
            <FileClock className="mr-2 w-4" />
            Tidak tersedia ({filteredInactive?.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="px-3">
          {filteredActive?.map((i) => {
            return (
              <div
                key={i.id}
                className="mb-2 flex flex-row items-center justify-between border-b border-zinc-100 py-1"
              >
                <img
                  src={i.imgs[0]}
                  className="h-11 w-11 rounded-sm object-cover"
                />
                <div className="ml-2 flex w-full flex-col justify-start overflow-hidden">
                  <span className="block truncate whitespace-nowrap text-sm font-semibold">
                    {i.title}
                  </span>
                  <span className="block truncate whitespace-nowrap text-xs text-muted-foreground">
                    {i.description}
                  </span>
                  <span className="block whitespace-nowrap text-xs text-muted-foreground">
                    {formatPrice(i.price)}
                  </span>
                </div>
                <Button
                  variant={"secondary"}
                  className="ml-3 bg-zinc-50 text-xs"
                >
                  <Ellipsis className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="inactive" className="px-3">
          {filteredInactive?.map((i) => {
            return (
              <div
                key={i.id}
                className="mb-2 flex flex-row justify-between border-b border-zinc-100 py-1"
              >
                <img
                  src={i.imgs[0]}
                  className="h-14 w-14 rounded-sm object-cover"
                />
                <div className="ml-2 flex w-full flex-col justify-start overflow-hidden">
                  <span className="block truncate whitespace-nowrap text-sm font-semibold">
                    {i.title}
                  </span>
                  <span className="block truncate whitespace-nowrap text-xs text-muted-foreground">
                    {i.description}
                  </span>
                  <span className="block whitespace-nowrap text-xs text-muted-foreground">
                    {formatPrice(i.price)}
                  </span>
                </div>
                <Button
                  variant={"secondary"}
                  className="ml-3 bg-zinc-50 text-xs"
                >
                  <Ellipsis className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
