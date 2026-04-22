import { UserRole } from 'src/enums/user-role.enum';

const RoleWeight: Record<UserRole, number> = {
    [UserRole.READONLY]: 0,
    [UserRole.EDITOR]: 1,
    [UserRole.ADMIN]: 2,
};

export function hasSufficientRole(minRoleRequired: UserRole, userRole: UserRole): boolean {
    const userWeight = RoleWeight[userRole];
    const minWeight = RoleWeight[minRoleRequired];
    if (userWeight === undefined || minWeight === undefined)
        throw new Error(`Invalid role comparison: ${userRole} vs ${minRoleRequired}`);
    return userWeight >= minWeight;
}
