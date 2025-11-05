import { validRoles } from 'src/types/user/user-roles.type';
import { modificationAccessControl } from 'src/functions/roles/modification-access-control';
import { modificationAuthFixture } from '@unit/fixtures/modification-auth.fixture';


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
