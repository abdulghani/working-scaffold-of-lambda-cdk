export function formatPrice(price: number | undefined) {
  if (!price) {
    return `Rp. ${new Intl.NumberFormat().format(0)}`;
  }
  return `Rp. ${new Intl.NumberFormat().format(price)}`;
}
