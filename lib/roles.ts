import type { UserRole } from "@/lib/types";

export const roleRank: Record<UserRole, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

export function roleMeetsRequirement(actorRole: UserRole, requiredRole: UserRole) {
  return roleRank[actorRole] >= roleRank[requiredRole];
}
