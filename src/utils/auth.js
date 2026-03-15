function isTruthyFlag(value) {
  if (value === true) return true;
  if (value === 1) return true;
  if (value === '1') return true;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'y' || normalized === 'yes';
  }

  return false;
}

export function normalizeAuthUser(user) {
  if (!user || typeof user !== 'object') return user;

  const isSuperUser = isTruthyFlag(user.isSuperUser) || isTruthyFlag(user.is_super_user);
  const isActive = isTruthyFlag(user.isActive) || isTruthyFlag(user.is_active);

  return {
    ...user,
    role: user.role ?? user.authority ?? user.userRole ?? null,
    isSuperUser,
    is_super_user: isSuperUser,
    isActive,
    is_active: isActive,
    name: user.name ?? user.nickname ?? user.username ?? user.email ?? '사용자',
  };
}

export function isAdminUser(user) {
  const normalizedUser = normalizeAuthUser(user);

  if (!normalizedUser) return false;

  return Boolean(
    normalizedUser.role === 'ROLE_ADMIN'
    || normalizedUser.role === 'ADMIN'
    || normalizedUser.role === 'SUPER_ADMIN'
    || normalizedUser.isSuperUser
    || normalizedUser.is_super_user
  );
}
