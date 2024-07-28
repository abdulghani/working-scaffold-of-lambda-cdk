import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import { useFetcher } from "@remix-run/react";
import { useMemo } from "react";

export function Addon({ addon, menu, className, disabled }: any) {
  const fetcher = useFetcher();

  const isLoading = useMemo(() => {
    return disabled || fetcher.state === "submitting" || !menu?.active;
  }, [disabled, fetcher.state, menu?.active]);

  function toggleAddon(addon: any) {
    const formData = new FormData();
    formData.append("_action", "toggleAddon");
    formData.append("id", addon.id);
    formData.append("active", String(!addon.active));

    fetcher.submit(formData, { method: "POST" });
  }

  return (
    <div
      key={addon.id}
      className="flex shrink-0 flex-row items-center justify-between px-3 py-2 transition-colors hover:bg-zinc-50"
    >
      <div className="flex w-full flex-col justify-start overflow-hidden">
        <span className="block truncate whitespace-nowrap text-sm font-semibold">
          {addon.title}
        </span>
        <span className="block truncate whitespace-nowrap text-xs text-muted-foreground">
          {addon.description}
        </span>
        <span className="block whitespace-nowrap text-xs text-muted-foreground">
          {formatPrice(addon.price)}
        </span>
      </div>
      <Switch
        className={cn("ml-3 mr-1", className)}
        checked={menu?.active && addon?.active}
        onCheckedChange={() => toggleAddon(addon)}
        disabled={isLoading}
      />
    </div>
  );
}
