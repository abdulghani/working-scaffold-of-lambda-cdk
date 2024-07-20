import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { isNotificationSupported } from "@/lib/is-notification-supported";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator, useSubmit } from "@remix-run/react";
import {
  sessionCookie,
  verifySession,
  verifySessionPOSAccess
} from "app/service/auth";
import {
  getSubscription,
  getVAPIDKey,
  removeSubscription,
  saveSubscription
} from "app/service/push";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import packageJSON from "../../package.json";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const sessionToken = await sessionCookie.parse(request.headers.get("Cookie"));
  const isSubscribed = await getSubscription?.(sessionToken);
  const applicationServerKey = getVAPIDKey?.();

  return { isSubscribed, applicationServerKey };
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await verifySession?.(request);
  const body = await request.json();
  const sessionToken = await sessionCookie.parse(request.headers.get("Cookie"));

  if (body?._action === "subscribe_push") {
    await saveSubscription?.({
      userId,
      sessionToken,
      subscription: body.subscription
    });
  } else if (body?._action === "unsubscribe_push") {
    await removeSubscription?.(sessionToken);
  }

  return {};
}

export default function Settings() {
  const loaderData = useLoaderData<any>();
  const revalidator = useRevalidator();
  const [subP256dh, setSubP256dh] = useState<string | null | undefined>(null);
  const submit = useSubmit();

  const getSubscription = useCallback(async () => {
    const sw = await navigator?.serviceWorker?.ready;
    const sub = await sw?.pushManager?.getSubscription?.();
    const data = sub?.toJSON();
    return data?.keys?.p256dh;
  }, []);

  useEffect(() => {
    if (!subP256dh) {
      getSubscription().then((data) => setSubP256dh(data));
    }
  }, [subP256dh, getSubscription]);

  const [isSubscribed, applicationServerKey] = useMemo(() => {
    return [
      isNotificationSupported?.() &&
        Notification?.permission === "granted" &&
        loaderData.isSubscribed &&
        subP256dh &&
        loaderData.isSubscribed === subP256dh,
      loaderData.applicationServerKey
    ];
  }, [loaderData, subP256dh]);

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
        setSubP256dh(await getSubscription());
        submit(
          JSON.stringify({ _action: "subscribe_push", subscription: newSub }),
          {
            method: "POST",
            encType: "application/json"
          }
        );
      } else if (isSubscribed) {
        const sw = await navigator.serviceWorker.ready;
        const existingSub = await sw.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
        setSubP256dh(null);
        submit(
          JSON.stringify({
            _action: "unsubscribe_push"
          }),
          {
            method: "POST",
            encType: "application/json"
          }
        );
        revalidator.revalidate();
      }
    },
    [isSubscribed, revalidator, applicationServerKey, getSubscription, submit]
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
            <TableRow className="text-muted-foreground">
              <TableCell className="whitespace-nowrap">Version</TableCell>
              <TableCell className="text-right">
                {packageJSON.version}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
