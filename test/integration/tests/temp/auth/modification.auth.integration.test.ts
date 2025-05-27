import { createUser, status2xx, testKit } from '@integration/utils';
import { UserRole, validRoles } from '@root/types/user';
import request from 'supertest';

const cases = [
    // editor
    { currentRole: 'editor', targetRole: 'admin', expect: 403 },
    { currentRole: 'editor', targetRole: 'readonly', expect: 403 },
    { currentRole: 'editor', targetRole: 'editor', expect: 403 },

    // admin
    { currentRole: 'admin', targetRole: 'editor', expect: status2xx },
    { currentRole: 'admin', targetRole: 'readonly', expect: status2xx },
    { currentRole: 'admin', targetRole: 'admin', expect: 403 }, // can't modify other admins

    // readonly
    { currentRole: 'readonly', targetRole: 'readonly', expect: 403 },
    { currentRole: 'readonly', targetRole: 'editor', expect: 403 },
    { currentRole: 'readonly', targetRole: 'admin', expect: 403 },

] as const;

describe('Authorization', () => {
    describe('DELETE api/users/:id', () => {
        test.concurrent.each(
            validRoles
        )('%s users can delete their own accounts', async (role: UserRole) => {
            const { sessionToken, userId } = await createUser(role);

            // Self-deleting
            await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)                
                .expect(status2xx);
        });

        test.concurrent.each(
            cases
        )('return status $expect when $currentRole tries to delete an $targetRole', async ({ currentRole, targetRole, expect }) => {
            const { sessionToken: currentUserToken } = await createUser(currentRole);
            const { userId: targetUserId } = await createUser(targetRole);

            // Current user deletes target user
            await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserToken}`)
                .expect(expect as any);
        });
    });

    describe('UPDATE api/users/:id', () => {
        test.concurrent.each(
            validRoles
        )('%s users can update their own accounts', async (role: UserRole) => {
            const { sessionToken, userId } = await createUser(role);

            // Self-updating
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: testKit.userDataGenerator.name() })
                .expect(status2xx);
        });

        test.concurrent.each(
            cases
        )('return status $expect when $currentRole tries to update an $targetRole', async ({ currentRole, targetRole, expect }) => {
            const { sessionToken: currentUserToken } = await createUser(currentRole);
            const { userId: targetUserId } = await createUser(targetRole);

            // Current user deletes target user
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserToken}`)
                .send({ name: testKit.userDataGenerator.name() })
                .expect(expect as any);
        });
    });
});


