

const cases = [
    { currentRole: 'editor', targetRole: 'admin', expect: 403 },
    { currentRole: 'admin', targetRole: 'editor', expect: 200 },
    { currentRole: 'editor', targetRole: 'readonly', expect: 403 },
    { currentRole: 'readonly', targetRole: 'readonly', expect: 403 },
    { currentRole: 'admin', targetRole: 'admin', expect: 403 }, // can't modify other admins
];

// describe('Authorization Enforcement - DELETE /users/:id', () => {
//     test.each(cases)(
//         'should return $expect when $currentRole tries to delete $targetRole',
//         async ({ currentRole, targetRole, expect }) => {
//             const currentUser = await createUserWithRole(currentRole);
//             const targetUser = await createUserWithRole(targetRole);

//             const token = getTokenFor(currentUser);

//             const res = await request(app)
//                 .delete(`/api/users/${targetUser.id}`)
//                 .set('Authorization', `Bearer ${token}`);

//             expect(res.status).toBe(expect);
//         }
//     );
// });




/*
test.each(validRoles)
            ('%s users can update their account', async (role: string) => {
                // Create user
                const createdUser = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                const sessionToken = createdUser.body.token;
                const userId = createdUser.body.user.id;

                // Change the user artificially
                await testKit.userModel.findByIdAndUpdate(userId, { role });

                // Update
                await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ name: testKit.userDataGenerator.name() })
                    .expect(status2xx);
            });

        describe('admin users', () => {
            test.each(['readonly', 'editor'])
                ('can update %s users', async (targetUserRole: string) => {
                    // Create administrator
                    const adminUser = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const adminSessionToken: string = adminUser.body.token;
                    await testKit.userModel.findByIdAndUpdate(adminUser.body.user.id, { role: 'admin' });

                    // Create target user
                    const targetUserCreated = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const targetUserId: string = targetUserCreated.body.user.id;
                    await testKit.userModel.findByIdAndUpdate(targetUserId, { role: targetUserRole });

                    // Update
                    await request(testKit.server)
                        .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                        .set('Authorization', `Bearer ${adminSessionToken}`)
                        .send({ name: testKit.userDataGenerator.name() })
                        .expect(status2xx);
                });

            test('return 403 FORBIDDEN when tries to update other admin users', async () => {
                const expectedStatus = 403;

                // Create administrator
                const adminUser = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                await testKit.userModel.findByIdAndUpdate(adminUser.body.user.id, { role: 'admin' });
                const adminSessionToken: string = adminUser.body.token;

                // Create another administrator
                const anotherAdmin = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                await testKit.userModel.findByIdAndUpdate(anotherAdmin.body.user.id, { role: 'admin' });
                const anotherAdminId = anotherAdmin.body.user.id;

                // Update
                const response = await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${anotherAdminId}`)
                    .set('Authorization', `Bearer ${adminSessionToken}`)
                    .send({ name: testKit.userDataGenerator.name() })                    

                expect(response.statusCode).toBe(expectedStatus);
                expect(response.body).toStrictEqual({ error: 'You do not have permissions to perform this action' });
            });
        });

        describe.each(['readonly', 'editor'])('%s users', (reqUserRole: string) => {
            test.each(validRoles)
                ('return 403 FORBIDDEN when tries to update other %s users', async (targetUserRole: string) => {
                    const expectedStatus = 403;

                    // Create request user and set role artificially
                    const reqUserCreated = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const reqUserSessionToken: string = reqUserCreated.body.token;
                    await testKit.userModel.findByIdAndUpdate(reqUserCreated.body.user.id, { role: reqUserRole });

                    // Create target user and set role artificially
                    const targetUserCreated = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const targetUserId: string = targetUserCreated.body.user.id;
                    await testKit.userModel.findByIdAndUpdate(targetUserId, { role: targetUserRole });

                    // Update
                    const response = await request(testKit.server)
                        .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                        .set('Authorization', `Bearer ${reqUserSessionToken}`)
                        .send({ name: testKit.userDataGenerator.name() });

                    expect(response.statusCode).toBe(expectedStatus);
                    expect(response.body).toStrictEqual({ error: 'You do not have permissions to perform this action' });
                });
        });
*/