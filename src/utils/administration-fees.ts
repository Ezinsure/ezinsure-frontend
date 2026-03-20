/**
 * Administration fee rules for insurance applications (apply forms).
 *
 * Motor vehicle (car / motorbike / moto):
 *   - COMESA selected: 25% of 12,500 RWF
 *   - COMESA not selected: 25% of 2,500 RWF
 *
 * All other categories: 25% of 1,500 RWF (unchanged legacy rule).
 */

const VEHICLE_BASE_COMESA = 12_500;
const VEHICLE_BASE_STANDARD = 2_500;
const NON_VEHICLE_BASE = 1_500;
const ADMIN_FEE_RATE = 0.25;

export function isMotorVehicleInsuranceCategory(category: string): boolean {
  const c = (category || '').toLowerCase();
  return (
    c.includes('car') ||
    c.includes('motor') ||
    c.includes('moto') ||
    c.includes('motorbike')
  );
}

/**
 * Returns administration fees in RWF (integer).
 */
export function calculateAdministrationFeesRwf(
  insuranceCategory: string,
  isCOMESA: boolean,
): number {
  if (isMotorVehicleInsuranceCategory(insuranceCategory)) {
    const base = isCOMESA ? VEHICLE_BASE_COMESA : VEHICLE_BASE_STANDARD;
    return Math.round(base * ADMIN_FEE_RATE);
  }
  return Math.round(NON_VEHICLE_BASE * ADMIN_FEE_RATE);
}
