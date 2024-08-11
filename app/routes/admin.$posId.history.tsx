import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ClientActionFunctionArgs,
  Form,
  redirect,
  useLoaderData,
  useNavigation,
  useSubmit
} from "@remix-run/react";
import localforage from "localforage";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";

export async function clientLoader() {
  const notifications: any[] =
    (await localforage.getItem("notifications")) || [];
  const sorted = notifications.sort((a, b) => {
    return b.timestamp?.localeCompare?.(a.timestamp) || 0;
  });
  const read = sorted.filter((n) => n.read_at);

  return {
    notifications: sorted,
    read
  };
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const payload = await request.formData().then(Object.fromEntries);

  if (payload._action === "clear") {
    await localforage.removeItem("notifications");
    if (navigator.clearAppBadge) {
      await navigator.clearAppBadge();
    }
    return { _action: "clear" };
  } else if (payload._action === "clearRead") {
    const notifications: any[] =
      (await localforage.getItem("notifications")) || [];
    const filtered = notifications.filter((n) => !n.read_at);
    await localforage.setItem("notifications", filtered);
    if (filtered.length && navigator.setAppBadge) {
      await navigator.setAppBadge(filtered.length);
    } else if (!filtered.length && navigator.clearAppBadge) {
      await navigator.clearAppBadge();
    }
    return { _action: "clearRead" };
  } else if (payload._action === "READ_NOTIFICATION") {
    const sw = await navigator.serviceWorker.ready;
    sw.active?.postMessage?.(payload);
    throw redirect(payload.path || "/admin");
  }

  return {};
}

export default function AdminPOSHistory() {
  const { notifications, read } = useLoaderData<typeof clientLoader>();
  const [shouldClear, setShouldClear] = useState(false);
  const [shouldClearRead, setShouldClearRead] = useState(false);
  const navigation = useNavigation();
  const isBusy = useMemo(() => {
    return navigation.state === "loading" || navigation.state === "submitting";
  }, [navigation.state]);
  const submit = useSubmit();

  async function handleClick(notification: any) {
    const form = new FormData();
    form.append("_action", "READ_NOTIFICATION");
    Object.entries(notification).forEach(([key, value]: any) => {
      form.append(key, value);
    });
    submit(form, { method: "post" });
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 pb-[4rem]">
      <Table>
        <TableBody>
          <TableRow className="text-xs">
            <TableCell className="text-muted-foreground">
              <div className="pl-3">Notifikasi</div>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              Waktu
            </TableCell>
          </TableRow>
          {!notifications?.length ? (
            <TableRow>
              <TableCell
                className="text-center text-muted-foreground"
                colSpan={2}
              >
                Tidak ada notifikasi
              </TableCell>
            </TableRow>
          ) : (
            notifications.map((notification: any) => {
              return (
                <TableRow
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                >
                  <TableCell className="flex flex-row items-center gap-4">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        !notification.read_at
                          ? "animate-pulse bg-blue-200"
                          : "bg-zinc-300"
                      )}
                    ></div>
                    <div className="flex flex-col gap-0">
                      <span className="whitespace-nowrap text-sm">
                        {notification.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {notification.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {DateTime.fromISO(notification.timestamp).toRelative()}
                  </TableCell>
                </TableRow>
              );
            })
          )}
          {notifications?.length > 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground">
                <div className="flex w-full flex-row justify-between">
                  <div onClick={() => setShouldClear(true)}>Hapus semua</div>
                  <div
                    className={cn(!read?.length && "opacity-50")}
                    onClick={() => read?.length > 0 && setShouldClearRead(true)}
                  >
                    Hapus terbaca
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AlertDialog open={shouldClear || shouldClearRead}>
        <AlertDialogContent className="flex w-full flex-col">
          <div className="flex flex-col items-center">
            <span className="text-base font-semibold">Anda yakin?</span>
            <span className="text-sm text-muted-foreground">
              {shouldClearRead
                ? `${read.length} Notifikasi yang sudah terbaca akan dihapus`
                : `${notifications.length} notifikasi akan dihapus`}
            </span>
          </div>
          <Form
            className="flex w-full flex-row gap-2"
            method="post"
            onSubmit={() => {
              setShouldClear(false);
              setShouldClearRead(false);
            }}
          >
            <Button
              className="grow"
              type="submit"
              name="_action"
              value={shouldClearRead ? "clearRead" : "clear"}
              disabled={isBusy}
            >
              Ya
            </Button>
            <Button
              className="grow"
              variant={"secondary"}
              type="button"
              onClick={() => {
                setShouldClear(false);
                setShouldClearRead(false);
              }}
            >
              Tidak
            </Button>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
