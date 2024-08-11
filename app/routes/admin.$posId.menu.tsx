import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHandle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Menu,
  getAdminMenuByPOS,
  getMenuCategoryPOS,
  toggleMenu,
  toggleMenuAddon
} from "app/service/menu";
import { validatePOSId } from "app/service/pos";
import { CircleCheck, CircleX, Trash } from "lucide-react";
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
  const { menus, menuCategories } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const categorized = useMemo((): Menu[] => {
    return filter === "all"
      ? menus
      : (menus?.filter((i) => i.categories?.includes(filter)) as any);
  }, [menus, filter]);
  const filtered = useMemo(() => {
    if (!query.trim()) return categorized;
    const regex = new RegExp(query, "i");
    return categorized?.filter(
      (i: Menu) =>
        regex.test(i.title) ||
        i.addon_groups?.some(
          (k) =>
            regex.test(k.title) || k.addons?.some((j) => regex.test(j.title))
        )
    );
  }, [categorized, query]);
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
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isLoading = useMemo(() => {
    return (
      navigation.state === "loading" ||
      navigation.state === "submitting" ||
      fetcher.state === "submitting" ||
      fetcher.state === "loading"
    );
  }, [navigation.state, fetcher.state]);

  function toggleMenu(menu: any) {
    const form = new FormData();
    form.append("_action", "toggleMenu");
    form.append("id", menu.id);
    form.append("active", String(!menu.active));

    fetcher.submit(form, { method: "POST" });
  }

  return (
    <div className="flex w-full flex-col overflow-x-hidden">
      <div className="px-2">
        <div className="mb-2 mt-2 flex w-full snap-x snap-mandatory flex-row gap-1 overflow-x-scroll rounded-md bg-secondary px-1 py-1 shadow-inner">
          {menuFilter.map((menu) => (
            <Button
              className={cn(
                "h-fit shrink-0 whitespace-nowrap border-zinc-100 px-6 py-1.5 text-sm font-medium leading-normal shadow-none hover:bg-background hover:shadow-sm sm:flex-grow sm:px-6",
                filter === menu.id && "bg-background shadow-sm",
                filter !== menu.id && "text-muted-foreground"
              )}
              variant={"secondary"}
              onClick={() => setFilter(menu.id)}
              key={`menu-${menu.id}`}
            >
              {menu.title} ({menu.id === "all" ? menus?.length : menu.count})
            </Button>
          ))}
        </div>
      </div>
      <div className="px-3">
        <div
          className={cn(
            "mb-1 mt-0.5 flex w-full flex-row items-center rounded-md",
            query && "border border-blue-200"
          )}
        >
          <Button
            variant={"outline"}
            className="rounded-r-none"
            disabled={!query?.trim()}
            onClick={() => setQuery("")}
          >
            <Trash className="w-4" />
          </Button>
          <Input
            type="text"
            inputMode="search"
            placeholder="Cari nama, addon"
            className="rounded-l-none border-l-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered?.map((i) => {
        return (
          <div
            key={i.id}
            className="flex flex-row items-center px-3 py-2 transition-colors hover:bg-zinc-50"
            onClick={() => {
              setSelectedMenu(i.id);
            }}
          >
            <img
              src={i.imgs?.[0]}
              className="h-12 w-12 rounded-md object-cover"
            />
            <div className="ml-3 flex flex-grow flex-col justify-between overflow-hidden pr-5">
              <div className="flex flex-col">
                <span className="block truncate font-semibold">{i.title}</span>
                {i.addon_groups ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {i.addon_groups?.map((j) => j.title).join(", ")}
                  </span>
                ) : (
                  <span className="block truncate text-xs text-muted-foreground">
                    {i.description}
                  </span>
                )}
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatPrice(i.price)}
              </span>
            </div>
            <div className="mr-2 flex flex-col items-center">
              {/* <Checkbox checked={i.active} disabled/> */}
              {i.active ? (
                <CircleCheck className="h-5 w-5 text-muted-foreground opacity-50" />
              ) : (
                <CircleX className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        );
      })}

      <Drawer
        open={!!selectedMenu}
        onOpenChange={(e) => !e && setSelectedMenu(null)}
        disablePreventScroll={true}
        handleOnly={true}
      >
        <DrawerContent className="flex w-full flex-col items-center overflow-hidden rounded-t-sm px-0 pb-8 pt-0">
          <DrawerHandle />
          <div className="flex max-h-[80svh] w-full flex-col overflow-y-scroll pb-5">
            <div className="flex w-full flex-row items-center px-3 py-2 transition-colors hover:bg-zinc-50">
              <img
                src={debouncedSelectedMenu?.imgs?.[0]}
                className="h-12 w-12 rounded-sm object-cover"
              />
              <div className="ml-3 flex flex-col overflow-hidden pr-6">
                <span className="truncate whitespace-nowrap text-sm font-semibold">
                  {debouncedSelectedMenu?.title}
                </span>
                <span className="truncate whitespace-nowrap text-xs text-muted-foreground">
                  {debouncedSelectedMenu?.description}
                </span>
                <span className="mt-1 whitespace-nowrap text-sm text-muted-foreground">
                  {formatPrice(debouncedSelectedMenu?.price)}
                </span>
              </div>
              <Switch
                className="mr-1"
                checked={debouncedSelectedMenu?.active}
                onCheckedChange={() => toggleMenu(currentSelectedMenu)}
                disabled={isLoading}
              />
            </div>
            {debouncedSelectedMenu?.addon_groups?.map((i) => (
              <Fragment key={i.id}>
                <span className="mt-1 px-3 text-xs font-normal text-muted-foreground">
                  {i.title}
                </span>
                <div className="w-full px-3">
                  <div className="mb-1 mt-1 w-full border-t border-zinc-100"></div>
                </div>
                {i.addons?.map((j) => (
                  <Addon
                    key={j.id}
                    addon={j}
                    menu={debouncedSelectedMenu}
                    className=""
                    disabled={isLoading}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
