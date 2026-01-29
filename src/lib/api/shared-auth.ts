/**
 * Shared Auth API Client
 *
 * Fetches user data from Quality Program (the source of truth for auth).
 * Used by Roofing Report admin panel to display inspector information.
 */

const QUALITY_PROGRAM_API_URL = process.env.QUALITY_PROGRAM_API_URL || 'https://portal.ranz.org.nz';
const QUALITY_PROGRAM_API_KEY = process.env.QUALITY_PROGRAM_API_KEY;

/**
 * User data shape returned from Quality Program internal API.
 */
export interface SharedAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'RANZ_ADMIN' | 'RANZ_STAFF' | 'RANZ_INSPECTOR' | 'EXTERNAL_INSPECTOR' | 'MEMBER_COMPANY_ADMIN' | 'MEMBER_COMPANY_USER';
  status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED' | 'DEACTIVATED';
  companyId: string | null;
  company: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface SharedAuthResponse {
  users: SharedAuthUser[];
  total: number;
}

/**
 * Fetch users from Quality Program's internal API.
 *
 * @param userTypes - Optional array of user types to filter by
 * @param status - Optional status filter
 * @throws Error if API call fails or key not configured
 */
export async function fetchUsersFromSharedAuth(
  userTypes?: string[],
  status?: string
): Promise<SharedAuthUser[]> {
  if (!QUALITY_PROGRAM_API_KEY) {
    throw new Error('QUALITY_PROGRAM_API_KEY not configured');
  }

  const url = new URL(`${QUALITY_PROGRAM_API_URL}/api/internal/users`);

  if (userTypes && userTypes.length > 0) {
    url.searchParams.set('userType', userTypes.join(','));
  }

  if (status) {
    url.searchParams.set('status', status);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Internal-API-Key': QUALITY_PROGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always fetch fresh data
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch from shared auth: ${response.status} - ${error}`);
  }

  const data: SharedAuthResponse = await response.json();
  return data.users;
}

/**
 * Fetch inspectors (RANZ staff and inspectors) from Quality Program.
 * Filters to only inspector-relevant user types.
 */
export async function fetchInspectorsFromSharedAuth(): Promise<SharedAuthUser[]> {
  const inspectorTypes = ['RANZ_ADMIN', 'RANZ_STAFF', 'RANZ_INSPECTOR', 'EXTERNAL_INSPECTOR'];
  return fetchUsersFromSharedAuth(inspectorTypes);
}
