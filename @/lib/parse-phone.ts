export function parsePhone(phone: string) {
  if (!phone) return phone;
  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("0")) return phone.replace(/^0/, "+62");
  if (phone.startsWith("8")) return phone.replace(/^8/, "+628");
  return phone;
}
