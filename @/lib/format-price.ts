export function formatPrice(price: number) {
  return `Rp. ${new Intl.NumberFormat().format(price)}`;
}
