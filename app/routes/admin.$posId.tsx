import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Nav } from "@/components/ui/nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Outlet,
  useLoaderData,
  useLocation,
  useNavigation,
  useParams
} from "@remix-run/react";
import { verifySessionPOSAccess } from "app/service/auth";
import { validatePOSId } from "app/service/pos";
import {
  ClipboardList,
  LoaderCircle,
  Menu,
  NotepadText,
  Settings2,
  Users
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const { posId } = params;
  const [pos] = await Promise.all([validatePOSId?.(posId!)]);

  return { pos };
}

export function useDebouncedMenu<T = any>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const deferredValue = useDeferredValue(debouncedValue);

  useEffect(() => {
    if (value) {
      setDebouncedValue(value);
    } else {
      const timeout = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [value, delay]);

  return deferredValue;
}

export default function MenuAdmin() {
  const { pos } = useLoaderData<typeof loader>();
  const params = useParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHeaderTop = useDebouncedMenu(isMenuOpen, 500);
  const location = useLocation();
  const sectionId = useMemo(
    () => location.pathname.split("/").pop(),
    [location.pathname]
  );
  const navigation = useNavigation();
  const [isLoading, isSubmitting] = useMemo(() => {
    return [navigation.state === "loading", navigation.state === "submitting"];
  }, [navigation.state]);

  usePullToRefresh();

  return (
    <>
      <Sheet
        open={isMenuOpen && isHeaderTop}
        onOpenChange={(e) => setIsMenuOpen(e)}
      >
        <SheetContent
          side={"top"}
          className="z-40 mt-12 rounded-b-sm px-3 pb-2 sm:mt-[5.7rem]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <Nav
            className="border-t border-zinc-50"
            onClick={() => setTimeout(() => setIsMenuOpen(false), 200)}
            links={[
              {
                title: "Antrian",
                icon: Users,
                active: sectionId === "queue",
                to: `/admin/${params.posId}/queue`,
                disabled: isLoading
              },
              {
                title: "Pesanan",
                icon: ClipboardList,
                active: sectionId === "order",
                to: `/admin/${params.posId}/order`,
                disabled: isLoading
              },
              {
                title: "Menu",
                icon: NotepadText,
                active: sectionId === "menu",
                to: `/admin/${params.posId}/menu`,
                disabled: isLoading
              },
              {
                title: "Pengaturan",
                icon: Settings2,
                active: sectionId === "settings",
                to: `/admin/${params.posId}/settings`,
                disabled: isLoading
              }
            ]}
          />
        </SheetContent>
      </Sheet>

      <div className="flex w-full flex-col bg-background">
        <div
          className={cn(
            "sticky top-0 border-zinc-50 bg-background px-3 pb-3 sm:pb-3 sm:pt-2",
            isHeaderTop ? "z-50" : "z-40 border-b"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
        >
          <div className="mt-4 flex flex-row items-center px-2">
            <Avatar className="h-12 w-12 sm:h-20 sm:w-20">
              <AvatarImage src={pos?.profile_img} />
              <AvatarFallback>{pos?.name?.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex w-full flex-row justify-between overflow-hidden sm:ml-4">
              <div className="mr-3 flex flex-col overflow-hidden">
                <CardTitle className="truncate sm:text-3xl sm:leading-none">
                  {pos.name}
                </CardTitle>
                <CardDescription className="truncate sm:mt-1 sm:text-base sm:leading-none">
                  {pos.description}
                </CardDescription>
              </div>
              <Button variant={"ghost"} className="bg-zinc-50 px-[0.8rem]">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {(isLoading || isSubmitting) && (
          <div className="fixed left-0 top-0 z-30 flex h-[100svh] w-[100svw] flex-col transition-opacity">
            <LoaderCircle className="m-auto h-10 w-10 animate-spin text-zinc-900 opacity-20" />
          </div>
        )}

        <div
          className={cn(
            isLoading || isSubmitting ? "pointer-events-none opacity-40" : ""
          )}
        >
          <Outlet context={{ pos }} />
        </div>
      </div>
    </>
  );
}
