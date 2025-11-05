import { UserRole } from 'src/types/user/user-roles.type';

const sortedRoles: UserRole[] = ['readonly', 'editor', 'admin'];

export function hasSufficientRole(minRoleRequired: UserRole, userRole: UserRole): boolean {
    const userRoleIndex = sortedRoles.indexOf(userRole);
    const minRoleIndex = sortedRoles.indexOf(minRoleRequired);
    if (userRoleIndex === -1 || minRoleIndex === -1) {
        throw new Error(
            `Invalid role(s): userRole="${userRole}", minRoleRequired="${minRoleRequired}"`,
        );
    }
    return userRoleIndex >= minRoleIndex;
}
