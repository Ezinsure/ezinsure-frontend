/**
 * Administration fee rules for insurance applications (apply forms).
 *
 * Motor vehicle (car / motorbike / moto):
 *   - COMESA selected: 25% of 12,500 RWF → 3,125 RWF
 *   - COMESA not selected: 25% of 2,500 RWF → 625 RWF
 *
 * All other categories (fire, travel, tourist, etc.): flat 5,000 RWF.
 */

const VEHICLE_BASE_COMESA = 12_500;
const VEHICLE_BASE_STANDARD = 2_500;
const NON_VEHICLE_ADMIN_FEE_RWF = 5_000;
const ADMIN_FEE_RATE = 0.25;

/** Default motor commission share of net premium (company on admin apply). */
export const MOTOR_COMPANY_COMMISSION_RATE = 0.1;
/** Motor send-invoice split: agent and company each get half of the 10%. */
export const MOTOR_INVOICE_SPLIT_RATE = 0.05;

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
  return NON_VEHICLE_ADMIN_FEE_RWF;
}

/**
 * Total commission from net premium for a given percentage (e.g. 12 → 12% of premium).
 */
export function calculateCommissionFromPercentage(
  netPremium: number,
  commissionPercentage: number,
): number {
  if (!Number.isFinite(netPremium) || !Number.isFinite(commissionPercentage)) return 0;
  if (netPremium <= 0 || commissionPercentage < 0) return 0;
  return Math.round(netPremium * (commissionPercentage / 100));
}
