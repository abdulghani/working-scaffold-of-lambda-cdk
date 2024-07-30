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

  return {
    notifications: sorted
  };
}

export default function AdminPOSHistory() {
  const { notifications } = useLoaderData<typeof clientLoader>();
  const [revalidator] = useRevalidation();
  const [shouldClear, setShouldClear] = useState(false);
  const [shouldClearRead, setShouldClearRead] = useState(false);

  async function handleClick(notification: any) {
    if (!notification.read_at) {
      try {
        const id = notifications.findIndex(
          (n: any) => n.id === notification.id
        );
        if (id !== -1) {
          notifications[id].read_at = DateTime.now().toISO();
        }
        const unread = notifications.filter((n: any) => !n.read_at);
        localforage.setItem("notifications", notifications);
        if (unread.length && navigator.setAppBadge) {
          navigator.setAppBadge(unread.length);
        } else if (!unread.length && navigator.clearAppBadge) {
          navigator.clearAppBadge();
        }
      } catch (err) {
        // not doing anything
      }
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
      if (filtered.length && navigator.setAppBadge) {
        await navigator.setAppBadge(filtered.length);
      } else if (!filtered.length && navigator.clearAppBadge) {
        await navigator.clearAppBadge();
      }
      revalidator.revalidate();
    } catch (err) {
      // not doing anything
    }
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
            <>
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-right text-muted-foreground"
                  onClick={() => setShouldClearRead(true)}
                >
                  Hapus terbaca
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-right text-muted-foreground"
                  onClick={() => setShouldClear(true)}
                >
                  Hapus semua
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
      <AlertDialog open={shouldClear || shouldClearRead}>
        <AlertDialogContent className="flex w-full flex-col">
          <div className="flex flex-col items-center">
            <span className="text-base font-semibold">Anda yakin?</span>
            <span className="text-sm text-muted-foreground">
              {shouldClearRead
                ? "Notifikasi yang sudah terbaca akan dihapus"
                : "Semua notifikasi akan dihapus"}
            </span>
          </div>
          <div className="flex w-full flex-row gap-2">
            <Button
              className="grow"
              onClick={() => {
                if (shouldClear) {
                  clear();
                }
                if (shouldClearRead) {
                  clearRead();
                }
                setShouldClear(false);
                setShouldClearRead(false);
              }}
            >
              Ya
            </Button>
            <Button
              className="grow"
              variant={"secondary"}
              onClick={() => {
                setShouldClear(false);
                setShouldClearRead(false);
              }}
            >
              Tidak
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
