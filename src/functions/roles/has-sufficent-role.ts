import { UserRole } from 'src/enums/user-role.enum';

const sortedRoles: UserRole[] = [UserRole.READONLY, UserRole.EDITOR, UserRole.ADMIN];

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
