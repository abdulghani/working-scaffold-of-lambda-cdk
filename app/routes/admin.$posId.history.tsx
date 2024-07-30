import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useRevalidation } from "@/hooks/use-revalidation";
import { useLoaderData } from "@remix-run/react";
import localforage from "localforage";
import { DateTime } from "luxon";

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

  async function handleClick(notification: any) {
    try {
      const filtered = notifications.filter(
        (n: any) => n.id !== notification.id
      );
      localforage.setItem("notifications", filtered);
      if (filtered.length && navigator.setAppBadge) {
        navigator.setAppBadge(filtered.length);
      } else if (!filtered.length && navigator.clearAppBadge) {
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

  return (
    <div className="flex w-full flex-col items-center gap-2">
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
                    <div className="h-3 w-3 animate-pulse rounded-full bg-blue-200"></div>
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
        <div className="w-full px-3">
          <Button
            variant={"secondary"}
            className="w-full"
            onClick={() => clear()}
          >
            Hapus semua notifikasi
          </Button>
        </div>
      )}
    </div>
  );
}
