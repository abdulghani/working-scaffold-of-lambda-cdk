import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { verifySessionPOSAccess } from "app/service/auth";
import { getSubscription } from "app/service/push";
import { useMemo } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { posId, userId } =
    (await verifySessionPOSAccess?.(request, params.posId!)) || {};
  const isSubscribed = await getSubscription?.(userId);

  return { isSubscribed };
}

const isSupported = () =>
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

export default function Settings() {
  const loaderData = useLoaderData<any>();
  const revalidator = useRevalidator();
  const isSubscribed = useMemo(() => {
    return isSupported() && loaderData.isSubscribed;
  }, [loaderData.isSubscribed]);

  function subscribeNotification(e: boolean) {
    if (isSupported() && !isSubscribed) {
      Notification.requestPermission().then((permission) => {
        navigator.serviceWorker.ready.then((sw) => {
          sw.pushManager
            .subscribe({
              applicationServerKey:
                "BAU6i9j1DTZMhIg2bbKjWz-0S7b3_Vk4gAonLMBU7rD3XJwLLoWHFTyj5mndQalMXTVdPnT1GD62t8GQHm4cZjI",
              userVisibleOnly: true
            })
            .then((sub) => {
              fetch("/api/subscribe-push", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(sub)
              }).then(() => {
                revalidator.revalidate();
              });
            });
        });
      });
    }
  }

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
                  disabled={!isSupported()}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
