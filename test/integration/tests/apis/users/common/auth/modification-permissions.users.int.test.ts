import request from 'supertest';
import { UserRole, validRoles } from '@root/types/user';
import { createUser, status2xx, testKit } from '@integration/utils';
import { usersModificationCases } from './fixtures';

describe('Users API - Modification Permissions', () => {
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
            usersModificationCases
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

    describe('PATCH api/users/:id', () => {
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
            usersModificationCases
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


