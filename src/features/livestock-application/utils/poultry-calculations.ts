import type { LivestockAnimalRow, PoultryProductType } from '@/features/livestock-application/types';

const POULTRY_PREMIUM_RATE = 5.5;
const NKUNGANIRE_SHARE = 0.4;
const FARMER_SHARE = 0.6;

export function computePoultryLotAmounts(row: LivestockAnimalRow) {
  const quantity = parseFloat(row.quantity || '0') || 0;
  const unit = parseFloat(String(row.unitValue || '').replace(/\s/g, '')) || 0;
  const totalValue = Math.round(quantity * unit);
  const premium = Math.round(totalValue * (POULTRY_PREMIUM_RATE / 100));
  const nkunganire = Math.round(premium * NKUNGANIRE_SHARE);
  const farmer = Math.round(premium * FARMER_SHARE);

  return {
    sumAssured: totalValue > 0 ? String(totalValue) : '',
    premiumAmount: premium > 0 ? String(premium) : '',
    nkunganireAmount: nkunganire > 0 ? String(nkunganire) : '',
    farmerAmount: farmer > 0 ? String(farmer) : '',
  };
}

export function poultryPolicyEndDate(startDate: string, productType: PoultryProductType | ''): string {
  if (!startDate) return '';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start);
  if (productType === 'MEAT') {
    end.setDate(end.getDate() + 12 * 7);
  } else {
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
  }
  return end.toISOString().slice(0, 10);
}

export { POULTRY_PREMIUM_RATE };
