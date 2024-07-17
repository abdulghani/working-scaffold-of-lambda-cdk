import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { isNotificationSupported } from "@/lib/is-notification-supported";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { verifySessionPOSAccess } from "app/service/auth";
import { getSubscription, getVAPIDKey } from "app/service/push";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { userId } =
    (await verifySessionPOSAccess?.(request, params.posId!)) || {};
  const isSubscribed = await getSubscription?.(userId);
  const applicationServerKey = getVAPIDKey?.();

  return { isSubscribed, applicationServerKey };
}

export default function Settings() {
  const loaderData = useLoaderData<any>();
  const revalidator = useRevalidator();
  const [isSubscribed, applicationServerKey] = useMemo(() => {
    return [
      isNotificationSupported?.() &&
        Notification?.permission === "granted" &&
        loaderData.isSubscribed,
      loaderData.applicationServerKey
    ];
  }, [loaderData]);

  const subscribeNotification = useCallback(
    async function (e: boolean) {
      if (!isNotificationSupported?.()) {
        toast.error("Notifikasi tidak didukung", {
          description: "Perangkat tidak mendukung notifikasi"
        });
        return;
      } else if (!isSubscribed) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notifikasi tidak diizinkan", {
            description: "Aktifkan notifikasi di pengaturan"
          });
          return;
        }
        const sw = await navigator.serviceWorker.ready;
        const existingSub = await sw.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
        const newSub = await sw.pushManager.subscribe({
          applicationServerKey,
          userVisibleOnly: true
        });
        await fetch("/api/subscribe-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newSub)
        }).then(() => revalidator.revalidate());
      }
    },
    [isSubscribed, revalidator, applicationServerKey]
  );

  return (
    <div className="flex flex-col">
      <div className="mt-1 flex flex-col px-4">
        <span className="text-lg font-semibold">Pengaturan</span>
        <span className="text-sm text-muted-foreground">
          Pengaturan aplikasi
        </span>
      </div>
      <div className="px-2">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="whitespace-nowrap">#</TableCell>
              <TableCell className="text-right">Status</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="whitespace-nowrap">Notifikasi</TableCell>
              <TableCell className="text-right">
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={(e) => subscribeNotification(e)}
                  suppressHydrationWarning
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
