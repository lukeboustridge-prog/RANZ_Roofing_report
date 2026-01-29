/**
 * Role Mapping Utilities
 *
 * Maps between shared auth roles and display labels.
 * Provides permission check helpers for consistent access control.
 */

import type { AuthUserRole } from '@/lib/auth/types';

/**
 * Map shared AuthUserRole to display label.
 */
export function getAuthRoleLabel(role: AuthUserRole | string): string {
  const labels: Record<string, string> = {
    RANZ_ADMIN: 'RANZ Admin',
    RANZ_STAFF: 'RANZ Staff',
    RANZ_INSPECTOR: 'RANZ Inspector',
    EXTERNAL_INSPECTOR: 'External Inspector',
    MEMBER_COMPANY_ADMIN: 'Company Admin',
    MEMBER_COMPANY_USER: 'Company User',
  };
  return labels[role] || role;
}

/**
 * Check if a role has inspector management permissions.
 */
export function canManageInspectors(role: AuthUserRole | string): boolean {
  return ['RANZ_ADMIN', 'RANZ_STAFF'].includes(role);
}

/**
 * Check if a role is an inspector (can be assigned to reports).
 */
export function isInspectorRole(role: AuthUserRole | string): boolean {
  return ['RANZ_ADMIN', 'RANZ_STAFF', 'RANZ_INSPECTOR', 'EXTERNAL_INSPECTOR'].includes(role);
}

/**
 * Get badge variant for role display.
 */
export function getRoleBadgeVariant(role: AuthUserRole | string): 'default' | 'secondary' | 'outline' {
  if (['RANZ_ADMIN', 'RANZ_STAFF'].includes(role)) {
    return 'default';
  }
  if (['RANZ_INSPECTOR', 'EXTERNAL_INSPECTOR'].includes(role)) {
    return 'secondary';
  }
  return 'outline';
}
