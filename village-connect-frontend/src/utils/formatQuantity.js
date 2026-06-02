export function formatQuantity(quantity, unit) {
  if (!quantity) return "";

  const number = Number(quantity);
  const displayQuantity = Number.isFinite(number) ? number : quantity;
  const unitLabel = {
    items: number === 1 ? "item" : "items",
    kg: "kg",
    g: "g",
    packets: number === 1 ? "packet" : "packets",
    litres: number === 1 ? "litre" : "litres",
  };

  return `${displayQuantity} ${unitLabel[unit] || unit || "items"}`;
}
