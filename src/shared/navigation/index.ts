import type { ProductLine } from '@/shared/types/product-line';
import type { NavGroup } from '@/shared/navigation/types';
import { motorAdminNavigation } from '@/shared/navigation/motor/admin.nav';
import { motorAgentNavigation } from '@/shared/navigation/motor/agent.nav';
import { motorSuperAdminNavigation } from '@/shared/navigation/motor/super-admin.nav';
import { motorFinanceNavigation } from '@/shared/navigation/motor/finance.nav';
import { getLivestockAdminNavigation } from '@/shared/navigation/livestock/admin.nav';
import { livestockFinanceNavigation } from '@/shared/navigation/livestock/finance.nav';
import { livestockVetNavigation } from '@/shared/navigation/livestock/vet.nav';
import { livestockSonarwaNavigation } from '@/shared/navigation/livestock/sonarwa.nav';
import { motorSonarwaNavigation } from '@/shared/navigation/motor/sonarwa.nav';
import { SONARWA_REPRESENTATIVE_ROLE } from '@/shared/utils/role';

export function getNavigation(role: string, productLine: ProductLine): NavGroup[] {
  if (productLine === 'livestock') {
    switch (role) {
      case 'ADMIN':
        return getLivestockAdminNavigation('admin');
      case 'SUPER_ADMIN':
        return getLivestockAdminNavigation('super_admin');
      case 'VETERINARY':
        return livestockVetNavigation;
      case 'FINANCE':
        return livestockFinanceNavigation;
      case SONARWA_REPRESENTATIVE_ROLE:
        return livestockSonarwaNavigation;
      default:
        return [];
    }
  }

  switch (role) {
    case 'ADMIN':
      return motorAdminNavigation;
    case 'AGENT':
      return motorAgentNavigation;
    case 'SUPER_ADMIN':
      return motorSuperAdminNavigation;
    case 'FINANCE':
      return motorFinanceNavigation;
    case SONARWA_REPRESENTATIVE_ROLE:
      return motorSonarwaNavigation;
    default:
      return [];
  }
}
