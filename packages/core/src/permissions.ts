/**
 * Permission contract consumed by the agenda UI.
 *
 * This is intentionally a plain data type, not a permission *system*. The host
 * application decides how these flags are resolved (roles, plan tier, ownership)
 * and passes the result in. The agenda never asks "who is this user?"; it only
 * reads booleans.
 *
 * Keeping it this way is what allows the agenda to run in a demo with everything
 * set to `true`, and in production behind a real permission engine, with no
 * change to the agenda itself.
 */
export type AgendaActionPermissions = {
  canViewAll: boolean;
  canViewOwn: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canManageBlocks: boolean;
};

export const ALL_AGENDA_PERMISSIONS: AgendaActionPermissions = {
  canViewAll: true,
  canViewOwn: true,
  canCreate: true,
  canUpdate: true,
  canCancel: true,
  canManageBlocks: true,
};
