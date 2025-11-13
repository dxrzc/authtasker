import { UserRole } from 'src/enums/user-role.enum';

const validRoles: UserRole[] = [UserRole.READONLY, UserRole.EDITOR, UserRole.ADMIN];

export const getRandomRole = (): UserRole => {
    const randomIndex = Math.floor(Math.random() * validRoles.length);
    return validRoles[randomIndex];
};
