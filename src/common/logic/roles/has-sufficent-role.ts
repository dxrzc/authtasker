import { UserRole } from 'src/types/user/user-roles.type';

const roleHierarchy: Record<UserRole, number> = {
    readonly: 0,
    editor: 1,
    admin: 2,
};

export function hasSufficientRole(minRoleRequired: UserRole, userRole: UserRole): boolean {
    if (!(minRoleRequired in roleHierarchy) || !(userRole in roleHierarchy)) {
        throw new Error(`Invalid role(s): userRole="${userRole}", minRoleRequired="${minRoleRequired}"`);
    }
    return roleHierarchy[userRole] >= roleHierarchy[minRoleRequired];
}
