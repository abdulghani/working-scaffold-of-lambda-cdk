export function sortItems({ items, orderBy, orderDir }: any) {
  if (!orderBy) return items;
  return structuredClone(items).sort((a, b) => {
    switch (orderBy) {
      case "created_at":
        return (
          (new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()) *
          (orderDir === "asc" ? 1 : -1)
        );
      case "updated_at":
        return (
          (new Date(a.updated_at).getTime() -
            new Date(b.updated_at).getTime()) *
          (orderDir === "asc" ? 1 : -1)
        );
      case "status":
        return a.status.localeCompare(b.status) * (orderDir === "asc" ? 1 : -1);
      case "pax":
        return (a.pax - b.pax) * (orderDir === "asc" ? 1 : -1);
      default:
        return 0;
    }
  });
}
