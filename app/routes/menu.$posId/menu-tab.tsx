import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/format-price";
import { Link } from "@remix-run/react";
import { startCase } from "lodash-es";

export default function MenuTab({
  value,
  pos,
  menus,
  menuCategories,
  filter,
  setFilter,
  setSelectedMenuId
}: any) {
  return (
    <TabsContent value={value} className="m-0 overflow-x-hidden p-0">
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
              >
                <img
                  className="aspect-[4/3] w-full rounded-md object-cover"
                  src={menu.imgs?.find(Boolean)}
                  onClick={() => setSelectedMenuId(menu?.id)}
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
  );
}
