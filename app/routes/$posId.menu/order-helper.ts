export function createInstanceId(
  menuId: string,
  addonIds: (string | undefined)[] = []
) {
  const sortedAddonIds = addonIds.filter(Boolean).sort().join("-");
  return `${menuId}-${sortedAddonIds}`;
}

export function parseInstanceId(instanceId: string) {
  const [menuId, ...addonIds] = instanceId.split("-");
  return {
    menuId,
    addonIds: addonIds.filter(Boolean)
  };
}
