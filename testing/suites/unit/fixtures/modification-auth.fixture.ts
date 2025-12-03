import { UserRole } from 'src/enums/user-role.enum';

export const modificationAuthFixture = [
    { currentUserRole: UserRole.ADMIN, targetUserRole: UserRole.ADMIN, expected: 'forbidden' },
    { currentUserRole: UserRole.ADMIN, targetUserRole: UserRole.EDITOR, expected: 'authorized' },
    { currentUserRole: UserRole.ADMIN, targetUserRole: UserRole.READONLY, expected: 'authorized' },

    { currentUserRole: UserRole.EDITOR, targetUserRole: UserRole.ADMIN, expected: 'forbidden' },
    { currentUserRole: UserRole.EDITOR, targetUserRole: UserRole.EDITOR, expected: 'forbidden' },
    { currentUserRole: UserRole.EDITOR, targetUserRole: UserRole.READONLY, expected: 'forbidden' },

    { currentUserRole: UserRole.READONLY, targetUserRole: UserRole.ADMIN, expected: 'forbidden' },
    { currentUserRole: UserRole.READONLY, targetUserRole: UserRole.EDITOR, expected: 'forbidden' },
    {
        currentUserRole: UserRole.READONLY,
        targetUserRole: UserRole.READONLY,
        expected: 'forbidden',
    },
] as const;
