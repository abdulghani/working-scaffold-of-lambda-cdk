import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHandle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { TabsContent } from "@radix-ui/react-tabs";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { verifySessionPOSAccess } from "app/service/auth";
import {
  Menu,
  getAdminMenuByPOS,
  getMenuCategoryPOS,
  toggleMenu,
  toggleMenuAddon
} from "app/service/menu";
import { validatePOSId } from "app/service/pos";
import { ClipboardList, FileClock } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useDebouncedMenu } from "./admin.$posId";
import { Addon } from "./admin.$posId.menu/addon";

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

export async function action({ params, request }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const payload = await request.formData().then(Object.fromEntries);

  if (payload._action === "toggleAddon") {
    await toggleMenuAddon?.({
      addonId: payload.id,
      value: payload.active === "true"
    });
  } else if (payload._action === "toggleMenu") {
    await toggleMenu?.({
      menuId: payload.id,
      value: payload.active === "true"
    });
  }

  return {};
}

export default function AdminMenu() {
  const { pos, menus, menuCategories } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState("all");
  const [filteredActive, filteredInactive] = useMemo((): [Menu[], Menu[]] => {
    const filtered =
      filter === "all"
        ? menus
        : menus?.filter((i) => i.categories?.includes(filter));

    return filtered?.reduce(
      ([active, inactive], i) => {
        if (i.active) return [active.concat(i), inactive];
        return [active, inactive.concat(i)];
      },
      [[], []] as any
    );
  }, [menus, filter]);
  const menuFilter = useMemo(() => {
    return [{ id: "all", title: "Semua" }, ...(menuCategories ?? [])];
  }, [menuCategories]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const currentSelectedMenu = useMemo(() => {
    return menus?.find((i) => i.id === selectedMenu);
  }, [selectedMenu, menus]);
  const debouncedSelectedMenu = useDebouncedMenu<Menu | undefined>(
    currentSelectedMenu,
    500
  );
  const fetcher = useFetcher();

  function toggleMenu(menu: any) {
    const form = new FormData();
    form.append("_action", "toggleMenu");
    form.append("id", menu.id);
    form.append("active", String(!menu.active));

    fetcher.submit(form, { method: "POST" });
  }

  return (
    <div className="flex w-full flex-col overflow-x-hidden">
      <div className="mt-2 flex w-screen snap-x snap-mandatory flex-row overflow-x-scroll px-4 pb-2">
        {menuFilter.map((menu) => (
          <Button
            className={cn(
              "mr-2 border-zinc-100 hover:border hover:bg-white",
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
      <Tabs
        defaultValue="active"
        className="w-full overflow-x-hidden lg:w-[400px]"
      >
        <TabsList className="mx-3 mb-2 grid h-fit grid-cols-2">
          <TabsTrigger value="active">
            <ClipboardList className="mr-2 w-4" />
            Aktif ({filteredActive?.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <FileClock className="mr-2 w-4" />
            Non-aktif ({filteredInactive?.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {filteredActive?.map((i) => {
            return (
              <div
                key={i.id}
                className="flex flex-row items-center justify-between border-b border-zinc-100 px-3 py-2 transition-colors hover:bg-zinc-50"
                onClick={() => {
                  setSelectedMenu(i.id);
                }}
              >
                <img
                  src={i.imgs?.[0]}
                  className="h-11 w-11 rounded-sm object-cover"
                />
                <div className="ml-3 flex w-full flex-col justify-start overflow-hidden pr-2">
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
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="inactive">
          {filteredInactive?.map((i) => {
            return (
              <div
                key={i.id}
                className="flex flex-row justify-between border-b border-zinc-100 px-3 py-2 transition-colors hover:bg-zinc-50"
                onClick={() => {
                  setSelectedMenu(i.id);
                }}
              >
                <img
                  src={i.imgs?.[0]}
                  className="h-11 w-11 rounded-sm object-cover"
                />
                <div className="ml-3 flex w-full flex-col justify-start overflow-hidden pr-2">
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
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Drawer
        open={!!selectedMenu}
        onOpenChange={(e) => !e && setSelectedMenu(null)}
        disablePreventScroll={true}
        handleOnly={true}
      >
        <DrawerContent className="flex w-full flex-col items-center overflow-hidden rounded-t-sm px-0 pt-0">
          <DrawerHandle />
          <div className="flex max-h-[80svh] w-full flex-col overflow-y-scroll">
            <div className="flex w-full flex-row items-center px-3 py-2 transition-colors hover:bg-zinc-50">
              <img
                src={debouncedSelectedMenu?.imgs?.[0]}
                className="h-12 w-12 rounded-sm object-cover"
              />
              <div className="ml-3 flex flex-col overflow-hidden">
                <span className="truncate whitespace-nowrap text-sm font-semibold">
                  {debouncedSelectedMenu?.title}
                </span>
                <span className="truncate whitespace-nowrap text-xs text-muted-foreground">
                  {debouncedSelectedMenu?.description}
                </span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatPrice(debouncedSelectedMenu?.price)}
                </span>
              </div>
              <Switch
                className="ml-3 mr-1"
                checked={debouncedSelectedMenu?.active}
                onCheckedChange={() => toggleMenu(currentSelectedMenu)}
                disabled={fetcher.state === "submitting"}
              />
            </div>
            {debouncedSelectedMenu?.addon_groups?.map((i) => (
              <Fragment key={i.id}>
                <span className="mt-1 px-3 text-sm font-semibold">
                  {i.title}
                </span>
                <div className="w-full px-3">
                  <div className="mb-1 w-full border-t border-zinc-100"></div>
                </div>
                {i.addons?.map((j) => (
                  <Addon key={j.id} addon={j} menu={debouncedSelectedMenu} />
                ))}
              </Fragment>
            ))}
            <div className="w-full py-3"></div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
