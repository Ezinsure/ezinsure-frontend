import { FINANCE_MOCK_ENABLED } from '@/config/finance';

/**
 * Shown on every finance page when demo data is switched on
 * (NEXT_PUBLIC_FINANCE_MOCK=true), so fake figures can never be mistaken for real ones.
 */
export function DemoDataBanner() {
  if (!FINANCE_MOCK_ENABLED) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900"
    >
      Demo data — figures on this page are simulated and not from the live system.
    </div>
  );
}
