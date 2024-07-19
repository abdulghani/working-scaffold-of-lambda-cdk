export function getRequestSearchParams(request: Request) {
  const url = new URL(request.url);
  return Object.fromEntries(url.searchParams);
}
