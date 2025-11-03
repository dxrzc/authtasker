import { validRoles } from 'src/types/user/user-roles.type';
import { modificationAccessControl } from 'src/common/logic/roles/modification-access-control';

export const modificationAuthFixture = [
    { currentUserRole: 'admin', targetUserRole: 'admin', expected: 'forbidden' },
    { currentUserRole: 'admin', targetUserRole: 'editor', expected: 'authorized' },
    { currentUserRole: 'admin', targetUserRole: 'readonly', expected: 'authorized' },

    { currentUserRole: 'editor', targetUserRole: 'admin', expected: 'forbidden' },
    { currentUserRole: 'editor', targetUserRole: 'editor', expected: 'forbidden' },
    { currentUserRole: 'editor', targetUserRole: 'readonly', expected: 'forbidden' },

    { currentUserRole: 'readonly', targetUserRole: 'admin', expected: 'forbidden' },
    { currentUserRole: 'readonly', targetUserRole: 'editor', expected: 'forbidden' },
    { currentUserRole: 'readonly', targetUserRole: 'readonly', expected: 'forbidden' },
] as const;

describe('tasksModificationAccessControl', () => {
    test.each(validRoles)('%s users are authorized to modify themselves', (role) => {
        const currentUserInfo = { role, id: 'test-id' };
        const targetUserInfo = { role, id: currentUserInfo.id };
        const canModify = modificationAccessControl(currentUserInfo, targetUserInfo);
        expect(canModify).toBeTruthy();
    });

    test.each(modificationAuthFixture)(
        `$currentUserRole users $expected to modify other $targetUserRole users`,
        ({ currentUserRole, targetUserRole, expected }) => {
            const currentUserInfo = {
                role: currentUserRole,
                id: 'current-user-id',
            };
            const targetUserInfo = {
                role: targetUserRole,
                id: 'target-user-id',
            };
            const allowed = modificationAccessControl(currentUserInfo, targetUserInfo);
            if (expected === 'authorized') expect(allowed).toBeTruthy();
            else expect(allowed).toBeFalsy();
        },
    );
});
