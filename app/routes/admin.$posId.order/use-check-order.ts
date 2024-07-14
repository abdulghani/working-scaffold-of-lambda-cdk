import { padNumber } from "@/lib/pad-number";
import { signal } from "@preact/signals-react";
import { useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import { toast } from "sonner";

const TOAST_DURATION = 60_000 * 5; // 5 Minutes
const POLLING_INTERVAL = 60_000 * 1; // 1 Minute
const interval = signal<any>(null);

export function useCheckOrder({
  posId,
  onClick,
  notificationRef
}: {
  posId: string;
  onClick?: (orderId: string) => void;
  notificationRef: React.MutableRefObject<HTMLAudioElement | null>;
}) {
  const revalidator = useRevalidator();

  function createInterval(currentTime?: string) {
    if (!currentTime) {
      currentTime = new Date().toISOString();
    }
    return setInterval(() => {
      fetch(`/api/admin/${posId}/poll-order/${btoa(currentTime)}`).then(
        async (res) => {
          const data = await res.json();
          if (data?.length) {
            clearInterval(interval.value);
            if (notificationRef?.current) {
              notificationRef.current.currentTime = 0;
              notificationRef.current.muted = false;
              notificationRef.current.volume = 0.9;
              notificationRef.current.play();
            }
            revalidator.revalidate();
            data.forEach((i: any) => {
              toast.success(`Ada pesanan baru`, {
                id: currentTime,
                description: `Pesanan #${padNumber(i.temp_count)}, ${i.name}`,
                duration: TOAST_DURATION,
                action: onClick && {
                  label: "Lihat",
                  onClick: () => {
                    onClick(i.id);
                  }
                }
              });
            });
            interval.value = createInterval();
          }
        }
      );
    }, POLLING_INTERVAL);
  }

  useEffect(() => {
    if (!interval.value) {
      interval.value = createInterval();
    }
  }, []);
}
