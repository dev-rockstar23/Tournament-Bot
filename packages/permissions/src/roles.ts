export enum AppRole {
  VIEWER = 0,
  PLAYER = 1,
  REFEREE = 2,
  TOURNAMENT_MANAGER = 3,
  SERVER_ADMIN = 4,
}

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.VIEWER]: 'Viewer',
  [AppRole.PLAYER]: 'Player',
  [AppRole.REFEREE]: 'Referee',
  [AppRole.TOURNAMENT_MANAGER]: 'Tournament Manager',
  [AppRole.SERVER_ADMIN]: 'Server Admin',
}

export function roleAtLeast(userRole: AppRole, required: AppRole): boolean {
  return userRole >= required
}

export function roleName(role: AppRole): string {
  return APP_ROLE_LABELS[role]
}
