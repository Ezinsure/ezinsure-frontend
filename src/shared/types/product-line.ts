export const PRODUCT_LINES = ['motor', 'livestock'] as const;

export type ProductLine = (typeof PRODUCT_LINES)[number];

export function isProductLine(value: string): value is ProductLine {
  return PRODUCT_LINES.includes(value as ProductLine);
}
