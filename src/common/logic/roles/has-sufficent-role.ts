import { UserRole, validRoles } from "@root/types/user";

export function hasSufficientRole(minRoleRequired: UserRole, userRole: UserRole): boolean {
    if (userRole === 'admin') return true;
    const minRoleValue = validRoles.indexOf(minRoleRequired);
    const roleValue = validRoles.indexOf(minRoleRequired);
    return (roleValue >= minRoleValue) ? true : false;
}