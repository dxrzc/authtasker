import { validRoles } from 'src/types/user/user-roles.type';
import { modificationAuthFixture } from '@unit/fixtures/modification-auth.fixture';
import { modificationAccessControl } from 'src/common/logic/roles/modification-access-control';

describe('tasksModificationAccessControl', () => {
    test.each(validRoles)('%s users are authorized themselves', async (role) => {
        const currentUserInfo = { role, id: 'test-id' };
        const targetUserInfo = { role, id: currentUserInfo.id };
        const canModify = modificationAccessControl(currentUserInfo, targetUserInfo);
        expect(canModify).toBeTruthy();
    });

    test.each(
        modificationAuthFixture
    )(`$currentUserRole users $expected to modify other $targetUserRole users`, async ({ currentUserRole, targetUserRole, expected }) => {
        const currentUserInfo = {
            role: currentUserRole,
            id: 'current-user-id'
        };
        const targetUserInfo = {
            role: targetUserRole,
            id: 'target-user-id'
        };

        const canModify = modificationAccessControl(currentUserInfo, targetUserInfo);
        (expected === 'authorized')
            ? expect(canModify).toBeTruthy()
            : expect(canModify).toBeFalsy();
    });
});