import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useRevalidation } from "@/hooks/use-revalidation";
import { cn } from "@/lib/utils";
import { useLoaderData } from "@remix-run/react";
import localforage from "localforage";
import { DateTime } from "luxon";
import { useState } from "react";

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

export default function AdminPOSHistory() {
  const { notifications, read } = useLoaderData<typeof clientLoader>();
  const [revalidator] = useRevalidation();
  const [shouldClear, setShouldClear] = useState(false);

  async function handleClick(notification: any) {
    try {
      const id = notifications.findIndex((n: any) => n.id === notification.id);
      if (id !== -1) {
        notifications[id].read_at = DateTime.now().toISO();
      }
      localforage.setItem("notifications", notifications);
      if (notifications.length && navigator.setAppBadge) {
        navigator.setAppBadge(notifications.length);
      } else if (!notifications.length && navigator.clearAppBadge) {
        navigator.clearAppBadge();
      }
    } catch (err) {
      // not doing anything
    }
    window.location.href = notification.path || "/admin";
  }

  async function clear() {
    try {
      await localforage.removeItem("notifications");
      if (navigator.clearAppBadge) {
        await navigator.clearAppBadge();
      }
      revalidator.revalidate();
    } catch (err) {
      // not doing anything
    }
  }

  async function clearRead() {
    try {
      const filtered = notifications.filter((n: any) => !n.read_at);
      await localforage.setItem("notifications", filtered);
      revalidator.revalidate();
    } catch (err) {
      // not doing anything
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Table>
        <TableBody>
          <TableRow className="text-xs">
            <TableCell className="text-muted-foreground">
              <div className="pl-3">#</div>
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
        </TableBody>
      </Table>
      {notifications?.length > 0 && (
        <div className="flex w-full flex-row gap-2 px-3">
          <Button
            variant={"secondary"}
            className="grow"
            onClick={() => setShouldClear(true)}
          >
            Hapus semua
          </Button>
          <Button
            variant={"secondary"}
            className="grow"
            disabled={!read?.length}
            onClick={() => clearRead()}
          >
            Hapus terbaca
          </Button>
        </div>
      )}
      <AlertDialog open={shouldClear}>
        <AlertDialogContent className="flex w-full flex-col">
          <div className="flex flex-col items-center">
            <span className="text-base font-semibold">Anda yakin?</span>
            <span className="text-sm text-muted-foreground">
              Semua notifikasi akan dihapus
            </span>
          </div>
          <div className="flex w-full flex-row gap-2">
            <Button
              className="grow"
              onClick={() => {
                clear();
                setShouldClear(false);
              }}
            >
              Ya
            </Button>
            <Button
              className="grow"
              variant={"secondary"}
              onClick={() => setShouldClear(false)}
            >
              Tidak
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
