import { HttpError } from '@root/common/errors/classes/http-error.class';

describe('HttpError', () => {
    test('badRequest returns 400', () => {
        const err = HttpError.badRequest('Bad request error');
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('Bad request error');
    });

    test('conflict returns 409', () => {
        const err = HttpError.conflict('Conflict error');
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(409);
        expect(err.message).toBe('Conflict error');
    });

    test('unAuthorized returns 401', () => {
        const err = HttpError.unAuthorized('Unauthorized error');
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe('Unauthorized error');
    });

    test('forbidden returns 403', () => {
        const err = HttpError.forbidden('Forbidden error');
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('Forbidden error');
    });

    test('notFound returns 404', () => {
        const err = HttpError.notFound('Not found error');
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('Not found error');
    });

    test('internalServer returns 500', () => {
        const err = HttpError.internalServer('Internal server error');
        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(500);
        expect(err.message).toBe('Internal server error');
    });
});
