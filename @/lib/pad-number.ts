export function padNumber(value: number, pad: number = 3) {
  if (String(value).length >= pad) {
    return String(value);
  }
  return String(value).padStart(pad, "0");
}
