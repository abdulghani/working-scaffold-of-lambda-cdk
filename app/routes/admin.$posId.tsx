import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Nav } from "@/components/ui/nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import { ClipboardList, Menu, NotepadText, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const { posId } = params;
  const [pos] = await Promise.all([validatePOSId?.(posId!)]);

  return { pos };
}

export function useDebouncedMenu(value: any, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

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

  return debouncedValue;
}

export default function MenuAdmin() {
  const { pos } = useLoaderData<typeof loader>();
  const params = useParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHeaderTop = useDebouncedMenu(isMenuOpen, 500);
  const location = useLocation();
  const sectionId = useMemo(() => {
    return location.pathname.split("/").pop();
  }, [location.pathname]);
  const navigation = useNavigation();
  const isLoading = useMemo(() => {
    return navigation.state === "loading";
  }, [navigation.state]);

  return (
    <>
      <Sheet
        open={isMenuOpen && isHeaderTop}
        onOpenChange={(e) => setIsMenuOpen(e)}
      >
        <SheetContent
          side={"top"}
          className="mt-12 rounded-b-sm px-3 pb-2"
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
              }
            ]}
          />
        </SheetContent>
      </Sheet>

      <div className="flex w-full flex-col">
        <div
          className={cn(
            "sticky top-0 border-zinc-50 bg-background px-3 pb-3",
            isHeaderTop ? "z-50" : "border-b"
          )}
        >
          <div
            className="mt-4 flex flex-row items-center px-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={pos?.profile_img} />
              <AvatarFallback>{pos?.name?.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="ml-3 flex w-full flex-row justify-between overflow-hidden">
              <div className="mr-3 flex flex-col overflow-hidden">
                <CardTitle className="truncate">{pos.name}</CardTitle>
                <CardDescription className="truncate">
                  {pos.description} Lorem ipsum, dolor sit amet consectetur
                  adipisicing elit. Atque, quis.
                </CardDescription>
              </div>
              <Button variant={"ghost"} className="bg-zinc-50 px-[0.8rem]">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          className={
            isLoading ? "pointer-events-none animate-pulse opacity-35" : ""
          }
        >
          <Outlet context={{ pos }} />
        </div>
      </div>
    </>
  );
}
