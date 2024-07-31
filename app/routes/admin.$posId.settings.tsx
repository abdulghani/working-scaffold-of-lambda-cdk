import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { isNotificationSupported } from "@/lib/is-notification-supported";
import { cn } from "@/lib/utils";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  ClientLoaderFunctionArgs,
  ShouldRevalidateFunctionArgs,
  useLoaderData,
  useSubmit
} from "@remix-run/react";
import {
  sessionCookie,
  verifySession,
  verifySessionPOSAccess
} from "app/service/auth";
import {
  getSubscription,
  getVAPIDKey,
  removeSubscription,
  saveSubscription,
  subscribeTopic,
  SUBSCRIPTION_TOPIC_LABEL
} from "app/service/push";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import packageJSON from "../../package.json";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const sessionToken = await sessionCookie.parse(request.headers.get("Cookie"));
  const { subscriptionKey, notificationSettings } =
    (await getSubscription?.(sessionToken)) || {};
  const applicationServerKey = getVAPIDKey?.();

  return { subscriptionKey, notificationSettings, applicationServerKey };
}

export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const serverData = await serverLoader<typeof loader>();
  const sw = await navigator?.serviceWorker?.ready;
  const sub = await sw?.pushManager?.getSubscription?.();
  const data = sub?.toJSON();
  const subP256dh = data?.keys?.p256dh;

  return {
    ...serverData,
    subP256dh,
    isSubscribed:
      serverData?.subscriptionKey &&
      subP256dh &&
      serverData.subscriptionKey === subP256dh
  };
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
  } else if (body?._action === "subscribe_topic") {
    await subscribeTopic?.({
      userId,
      topic: body.topic,
      value: true
    });
  } else if (body?._action === "unsubscribe_topic") {
    await subscribeTopic?.({
      userId,
      topic: body.topic,
      value: false
    });
  }

  return { ok: true };
}

export function shouldRevalidate({
  actionResult,
  defaultShouldRevalidate
}: ShouldRevalidateFunctionArgs) {
  if (actionResult?.ok) {
    return true;
  }
  return defaultShouldRevalidate;
}

export default function Settings() {
  const { notificationSettings, applicationServerKey, isSubscribed } =
    useLoaderData<any>();
  const submit = useSubmit();
  const [isLogout, setIsLogout] = useState(false);

  const subscribeTopic = useCallback(
    async function (topic: string, e: boolean) {
      if (!isSubscribed) {
        toast.error("Notifikasi tidak diaktifkan", {
          description: "Harap aktifkan notifikasi terlebih dahulu"
        });
        return;
      }
      submit(
        JSON.stringify({
          _action: e ? "subscribe_topic" : "unsubscribe_topic",
          topic
        }),
        {
          method: "POST",
          encType: "application/json"
        }
      );
    },
    [isSubscribed, submit]
  );

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
        submit(
          JSON.stringify({
            _action: "unsubscribe_push"
          }),
          {
            method: "POST",
            encType: "application/json"
          }
        );
      }
    },
    [isSubscribed, applicationServerKey, submit]
  );

  return (
    <>
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
              <TableRow className="text-xs text-muted-foreground">
                <TableCell>#</TableCell>
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
              {Object.entries(SUBSCRIPTION_TOPIC_LABEL).map(([key, value]) => {
                return (
                  <TableRow
                    key={key}
                    className={cn(!isSubscribed && "text-muted-foreground")}
                  >
                    <TableCell className="whitespace-nowrap">{value}</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={isSubscribed && notificationSettings?.[key]}
                        onCheckedChange={(e) => subscribeTopic(key, e)}
                        suppressHydrationWarning
                        disabled={!isSubscribed}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="text-muted-foreground">
                <TableCell className="whitespace-nowrap">Version</TableCell>
                <TableCell className="text-right">
                  {packageJSON.version}
                </TableCell>
              </TableRow>
              <TableRow onClick={() => setIsLogout(true)}>
                <TableCell className="whitespace-nowrap">
                  Keluar dari akun
                </TableCell>
                <TableCell className="text-right">Keluar</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={isLogout} onOpenChange={(e) => setIsLogout(e)}>
        <AlertDialogContent
          onClickOverlay={() => setIsLogout(false)}
          className="flex w-full flex-col"
        >
          <div className="flex w-full flex-col items-center gap-1">
            <span className="text-lg font-semibold">Keluar dari akun</span>
            <span className="text-sm text-muted-foreground">
              Anda yakin ingin keluar dari akun?
            </span>
          </div>
          <div className="flex w-full flex-row gap-2">
            <Button
              className="grow"
              variant={"default"}
              onClick={() => {
                window.location.href = "/login?logout=true";
              }}
            >
              Ya
            </Button>
            <Button
              className="grow"
              variant={"secondary"}
              onClick={() => setIsLogout(false)}
            >
              Batal
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
