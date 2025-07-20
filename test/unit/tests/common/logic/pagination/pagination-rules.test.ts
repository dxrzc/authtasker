import { paginationErrors } from '@root/common/errors/messages/pagination.error.messages';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { paginationRules } from '@logic/pagination/pagination-rules';
import { statusCodes } from '@root/common/constants/status-codes.constants';

// CHAT GPT WROTE THIS

describe('paginationRules()', () => {
    test('returns correct offset for valid inputs', () => {
        const offset = paginationRules(10, 2, 50); // page 2 → offset = 10
        expect(offset).toBe(10);
    });

    test('returns 0 offset for first page', () => {
        const offset = paginationRules(25, 1, 100);
        expect(offset).toBe(0);
    });

    test('throws INVALID_LIMIT error when limit is 0', () => {
        try {
            paginationRules(0, 1, 10);
        } catch (err: any) {
            expect(err).toBeInstanceOf(HttpError);
            expect(err.statusCode).toBe(statusCodes.BAD_REQUEST);
            expect(err.message).toBe(paginationErrors.INVALID_LIMIT);
        }
    });

    test('throws LIMIT_TOO_LARGE error when limit > 100', () => {
        try {
            paginationRules(101, 1, 10);
        } catch (err: any) {
            expect(err).toBeInstanceOf(HttpError);
            expect(err.statusCode).toBe(statusCodes.BAD_REQUEST);
            expect(err.message).toBe(paginationErrors.LIMIT_TOO_LARGE);
        }
    });

    test('throws INVALID_PAGE error when page is 0', () => {
        try {
            paginationRules(10, 0, 10);
        } catch (err: any) {
            expect(err).toBeInstanceOf(HttpError);
            expect(err.statusCode).toBe(statusCodes.BAD_REQUEST);
            expect(err.message).toBe(paginationErrors.INVALID_PAGE);
        }
    });

    test('throws PAGE_TOO_LARGE when page > total pages', () => {
        try {
            paginationRules(5, 6, 21); // 5 pages max, page 6 is invalid
        } catch (err: any) {
            expect(err).toBeInstanceOf(HttpError);
            expect(err.statusCode).toBe(statusCodes.BAD_REQUEST);
            expect(err.message).toBe(paginationErrors.PAGE_TOO_LARGE);
        }
    });

    test('works with exact number of pages', () => {
        // 20 docs, 5 per page → 4 pages total
        const offset = paginationRules(5, 4, 20); // page 4 → offset 15
        expect(offset).toBe(15);
    });

    test('handles partial last page', () => {
        // 23 docs, 5 per page → 5 pages (5 * 4 = 20, then 3 left)
        const offset = paginationRules(5, 5, 23);
        expect(offset).toBe(20);
    });
});
