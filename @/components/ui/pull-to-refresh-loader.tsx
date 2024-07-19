import { PullRefreshContext } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import { useContext } from "react";

export function PullToRefreshLoader() {
  const [isRefreshing] = useContext(PullRefreshContext);

  return (
    <div
      className={cn(
        "z-50 flex w-full flex-col items-center justify-center text-muted-foreground transition-all duration-100 ease-in",
        !isRefreshing
          ? "max-h-0 opacity-0"
          : "max-h-[20svh] pb-6 pt-5 opacity-100"
      )}
    >
      <LoaderCircle className={"h-9 w-9 animate-spin opacity-60"} />
    </div>
  );
}
