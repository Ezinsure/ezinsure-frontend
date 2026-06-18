// Use the super-admin analytics implementation (plain fetch) — the admin version
// uses apiFetch which force-logs out on any 401, breaking finance users when
// analytics endpoints reject non-admin roles.
export { default } from '@/app/super_admin/agents/analytics/page';
