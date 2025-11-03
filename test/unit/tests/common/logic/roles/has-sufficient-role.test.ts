import { hasSufficientRole } from '@logic/roles/has-sufficent-role';
import { UserRole, validRoles } from 'src/types/user/user-roles.type';

describe('hasSufficientRole', () => {
    describe('readonly is the minimum role required', () => {
        const readonlyRoleRequired: UserRole = 'readonly';

        test.concurrent.each(validRoles)('return true for %s', (role) => {
            expect(hasSufficientRole(readonlyRoleRequired, role)).toBeTruthy();
        });
    });

    describe('editor is the minimum role required', () => {
        const editorRoleRequired: UserRole = 'editor';

        test.concurrent.each(['editor', 'admin'] as const)('return true for %s', (role) => {
            expect(hasSufficientRole(editorRoleRequired, role)).toBeTruthy();
        });

        test.concurrent('returns false for readonly', () => {
            expect(hasSufficientRole(editorRoleRequired, 'readonly')).toBeFalsy();
        });
    });

    describe('admin is the minimum role required', () => {
        const adminRoleRequired: UserRole = 'admin';

        test.concurrent('returns true for admin', () => {
            expect(hasSufficientRole(adminRoleRequired, 'admin')).toBeTruthy();
        });

        test.concurrent.each(['editor', 'readonly'] as const)('return false for %s', (role) => {
            expect(hasSufficientRole(adminRoleRequired, role)).toBeFalsy();
        });
    });

    describe('role is not a valid role', () => {
        test('throw an error', async () => {
            const invalidRole = 'ultra-admin';
            expect(() => hasSufficientRole('admin', invalidRole as any)).toThrow();
        });
    });
});
