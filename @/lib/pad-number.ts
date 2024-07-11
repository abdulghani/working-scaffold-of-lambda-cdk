export function padNumber(value: number) {
  if (String(value).length >= 3) {
    return String(value);
  }
  return String(value).padStart(3, "0");
}
