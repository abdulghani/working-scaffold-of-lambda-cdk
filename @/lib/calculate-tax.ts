export function calculateTax(value: number, rate: number) {
  return (Number(value) || 0) * ((Number(rate) || 0) / 100);
}
