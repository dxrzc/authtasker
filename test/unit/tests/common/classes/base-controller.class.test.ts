import { Request, Response } from 'express';
import { BaseController } from 'src/common/base/base-controller.class';
import { UserFromRequest } from 'src/interfaces/user/user-from-request.interface';

class TestController extends BaseController {}

describe('BaseController', () => {
    describe('getUserRequestInfo', () => {
        let controller: TestController;
        let req: Partial<UserFromRequest>;
        let res: Partial<Response>;

        beforeEach(() => {
            controller = new TestController();
            req = {};
            res = {};
        });

        test('should return user info when all properties are present', () => {
            req.role = 'admin';
            req.id = '123';
            req.sessionJti = 'token123';
            req.sessionTokenExpUnix = 1234567890;

            const result = controller['getUserRequestInfo'](req as Request, res as Response);

            expect(result).toEqual({
                id: '123',
                role: 'admin',
                sessionJti: 'token123',
                sessionTokenExpUnix: 1234567890,
            });
        });

        test('should throw error if role is missing', () => {
            req.id = '123';
            req.sessionJti = 'token123';
            req.sessionTokenExpUnix = 1234567890;

            expect(() => controller['getUserRequestInfo'](req as Request, res as Response)).toThrow(
                'role, id, jti and tokenExp are expected',
            );
        });

        test('should throw error if userId is missing', () => {
            req.role = 'admin';
            req.sessionJti = 'token123';
            req.sessionTokenExpUnix = 1234567890;

            expect(() => controller['getUserRequestInfo'](req as Request, res as Response)).toThrow(
                'role, id, jti and tokenExp are expected',
            );
        });

        test('should throw error if jti is missing', () => {
            req.role = 'admin';
            req.id = '123';
            req.sessionTokenExpUnix = 1234567890;

            expect(() => controller['getUserRequestInfo'](req as Request, res as Response)).toThrow(
                'role, id, jti and tokenExp are expected',
            );
        });

        test('should throw error if tokenExp is missing', () => {
            req.role = 'admin';
            req.id = '123';
            req.sessionJti = 'token123';

            expect(() => controller['getUserRequestInfo'](req as Request, res as Response)).toThrow(
                'role, id, jti and tokenExp are expected',
            );
        });
    });
});
