import type { ProductLine } from '@/shared/types/product-line';
import { getRolePathPrefix } from '@/shared/routing/paths';

/** Build a canonical scoped app path (motor or livestock). */
export function getScopedPath(
  role: string,
  segment: string,
  productLine: ProductLine = 'motor',
): string {
  const prefix = getRolePathPrefix(role);
  const normalized = segment.replace(/^\//, '');

  if (role === 'AGENT') {
    return `/${prefix}/motor/${normalized}`;
  }

  if (role === 'VETERINARY') {
    return `/${prefix}/livestock/${normalized}`;
  }

  return `/${prefix}/${productLine}/${normalized}`;
}

/** Canonical motor routes (use in links and router.push). */
export const motorPaths = {
  admin: {
    dashboard: '/admin/motor/dashboard',
    applications: '/admin/motor/applications',
    myApplications: '/admin/motor/my-applications',
    newApplication: '/admin/motor/new-application',
    commissionReview: '/admin/motor/commission-review',
    users: '/admin/motor/users',
    expiringInsurance: '/admin/motor/expiring-insurance',
    smsTracking: '/admin/motor/sms-tracking',
    agentAnalytics: '/admin/motor/agents/analytics',
    faq: '/admin/motor/FAQ',
    profile: '/admin/motor/profile',
  },
  agent: {
    dashboard: '/agent/motor/dashboard',
    apply: '/agent/motor/apply',
    applications: '/agent/motor/applications',
    faq: '/agent/motor/FAQ',
    profile: '/agent/motor/profile',
  },
  superAdmin: {
    dashboard: '/super_admin/motor/dashboard',
    applications: '/super_admin/motor/applications',
    users: '/super_admin/motor/users',
    expiringInsurance: '/super_admin/motor/expiring-insurance',
    smsTracking: '/super_admin/motor/sms-tracking',
    agentAnalytics: '/super_admin/motor/agents/analytics',
    faq: '/super_admin/motor/FAQ',
    profile: '/super_admin/motor/profile',
  },
  finance: {
    dashboard: '/finance/motor/dashboard',
    payments: '/finance/motor/payments',
    paymentInitiated: '/finance/motor/payment-initiated',
    history: '/finance/motor/history',
    profile: '/finance/motor/profile',
  },
} as const;

/** Legacy motor paths (without /motor segment) → canonical paths. */
export const legacyMotorPathRedirects: Record<string, string> = {
  '/admin/dashboard': motorPaths.admin.dashboard,
  '/admin/applications': motorPaths.admin.applications,
  '/admin/my-applications': motorPaths.admin.myApplications,
  '/admin/new-application': motorPaths.admin.newApplication,
  '/admin/commission-review': motorPaths.admin.commissionReview,
  '/admin/users': motorPaths.admin.users,
  '/admin/expiring-insurance': motorPaths.admin.expiringInsurance,
  '/admin/sms-tracking': motorPaths.admin.smsTracking,
  '/admin/FAQ': motorPaths.admin.faq,
  '/admin/profile': motorPaths.admin.profile,
  '/admin/agents/analytics': motorPaths.admin.agentAnalytics,
  '/agent/dashboard': motorPaths.agent.dashboard,
  '/agent/apply': motorPaths.agent.apply,
  '/agent/applications': motorPaths.agent.applications,
  '/agent/FAQ': motorPaths.agent.faq,
  '/agent/profile': motorPaths.agent.profile,
  '/super_admin/dashboard': motorPaths.superAdmin.dashboard,
  '/super_admin/applications': motorPaths.superAdmin.applications,
  '/super_admin/users': motorPaths.superAdmin.users,
  '/super_admin/expiring-insurance': motorPaths.superAdmin.expiringInsurance,
  '/super_admin/sms-tracking': motorPaths.superAdmin.smsTracking,
  '/super_admin/FAQ': motorPaths.superAdmin.faq,
  '/super_admin/profile': motorPaths.superAdmin.profile,
  '/super_admin/agents/analytics': motorPaths.superAdmin.agentAnalytics,
  '/finance/dashboard': motorPaths.finance.dashboard,
  '/finance/payments': motorPaths.finance.payments,
  '/finance/payment-initiated': motorPaths.finance.paymentInitiated,
  '/finance/history': motorPaths.finance.history,
  '/finance/profile': motorPaths.finance.profile,
};
