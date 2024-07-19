import { useNavigation, useRevalidator } from "@remix-run/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from "react";

const OVERSCROLL_THRESHOLD = 120;
export const PullRefreshContext = createContext<any>([]);

export function usePullToRefresh() {
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useContext(PullRefreshContext);
  const shouldRefresh = useRef(false);
  const isLoading = useMemo(() => {
    return navigation.state === "loading";
  }, [navigation.state]);

  const handleScroll = useCallback(
    function () {
      if (
        0 - window.scrollY > OVERSCROLL_THRESHOLD &&
        !isRefreshing &&
        !shouldRefresh.current
      ) {
        shouldRefresh.current = true;
      }
    },
    [isRefreshing, shouldRefresh]
  );

  const handleEnd = useCallback(
    function () {
      if (
        shouldRefresh.current &&
        revalidator.state !== "loading" &&
        !isLoading &&
        !isRefreshing
      ) {
        shouldRefresh.current = false;
        setIsRefreshing(true);
        revalidator.revalidate();
        setTimeout(() => {
          setIsRefreshing(false);
        }, 1500);
      }
    },
    [shouldRefresh, revalidator, isLoading, isRefreshing, setIsRefreshing]
  );

  useEffect(() => {
    document.addEventListener("touchmove", handleScroll);
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("touchmove", handleScroll);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [handleScroll, handleEnd]);
}
