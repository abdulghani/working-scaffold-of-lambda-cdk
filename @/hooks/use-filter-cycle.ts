import { useCallback, useRef, useState } from "react";

export function useFilterCycle() {
  const [orderBy, setOrderBy] = useState("");
  const [orderDir, setOrderDir] = useState("asc");
  const filterCycle = useRef(0);
  const cycleThroughFilter = useCallback(
    function (filter: string) {
      if (orderBy === filter && filterCycle.current === 0) {
        setOrderBy("");
        filterCycle.current = (filterCycle.current + 1) % 2;
      } else if (orderBy === filter) {
        setOrderDir(orderDir === "asc" ? "desc" : "asc");
        filterCycle.current = (filterCycle.current + 1) % 2;
      } else {
        setOrderBy(filter);
        setOrderDir("desc");
        filterCycle.current = 1;
      }
    },
    [orderBy, filterCycle, orderDir]
  );

  return [orderBy, orderDir, cycleThroughFilter];
}
