import { UserRole } from 'src/enums/user-role.enum';
import { hasSufficientRole } from 'src/functions/roles/has-sufficent-role';

describe('hasSufficientRole', () => {
    describe('readonly is the minimum role required', () => {
        test.each([UserRole.READONLY, UserRole.EDITOR, UserRole.ADMIN] as const)(
            'return true for %s',
            (role) => {
                expect(hasSufficientRole(UserRole.READONLY, role)).toBeTruthy();
            },
        );
    });

    describe('editor is the minimum role required', () => {
        test.each([UserRole.EDITOR, UserRole.ADMIN] as const)('return true for %s', (role) => {
            expect(hasSufficientRole(UserRole.EDITOR, role)).toBeTruthy();
        });

        test('returns false for readonly', () => {
            expect(hasSufficientRole(UserRole.EDITOR, UserRole.READONLY)).toBeFalsy();
        });
    });

    describe('admin is the minimum role required', () => {
        test('returns true for admin', () => {
            expect(hasSufficientRole(UserRole.ADMIN, UserRole.ADMIN)).toBeTruthy();
        });

        test.each([UserRole.EDITOR, UserRole.READONLY] as const)('return false for %s', (role) => {
            expect(hasSufficientRole(UserRole.ADMIN, role)).toBeFalsy();
        });
    });

    describe('role is not a valid role', () => {
        test('throw an error', () => {
            const invalidRole = 'ultra-admin';
            expect(() => hasSufficientRole(UserRole.ADMIN, invalidRole as any)).toThrow();
        });
    });
});
