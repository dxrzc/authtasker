import { calculatePagination } from 'src/functions/pagination/calculate-pagination';
import { paginationErrors } from 'src/messages/pagination.error.messages';

describe('calculatePagination', () => {
    describe('Valid inputs', () => {
        test('should calculate offset and totalPages correctly for standard input', () => {
            const limit = 10;
            const page = 1;
            const totalDocuments = 100;
            const result = calculatePagination(limit, page, totalDocuments);
            expect(result).toEqual({ offset: 0, totalPages: 10 });
        });

        test('should calculate offset correctly for second page', () => {
            const limit = 10;
            const page = 2;
            const totalDocuments = 100;
            const result = calculatePagination(limit, page, totalDocuments);
            expect(result).toEqual({ offset: 10, totalPages: 10 });
        });

        test('should calculate totalPages correctly when totalDocuments is not a multiple of limit', () => {
            const limit = 10;
            const page = 1;
            const totalDocuments = 25;
            const result = calculatePagination(limit, page, totalDocuments);
            expect(result).toEqual({ offset: 0, totalPages: 3 });
        });

        test('should handle totalDocuments = 0', () => {
            const limit = 10;
            const page = 1;
            const totalDocuments = 0;
            const result = calculatePagination(limit, page, totalDocuments);
            expect(result).toEqual({ offset: 0, totalPages: 0 });
        });

        test('should calculate offset correctly even if page > totalPages', () => {
            // The function does not throw if page > totalPages, it just calculates offset.
            const limit = 10;
            const page = 5;
            const totalDocuments = 20; // totalPages = 2
            const result = calculatePagination(limit, page, totalDocuments);
            expect(result).toEqual({ offset: 40, totalPages: 2 });
        });
    });

    describe('Invalid inputs', () => {
        test('should throw badRequest if limit is NaN', () => {
            expect(() => calculatePagination(NaN, 1, 100)).toThrow(paginationErrors.INVALID_LIMIT);
        });

        test('should throw badRequest if page is NaN', () => {
            expect(() => calculatePagination(10, NaN, 100)).toThrow(paginationErrors.INVALID_PAGE);
        });

        test('should throw badRequest if limit is <= 0', () => {
            expect(() => calculatePagination(0, 1, 100)).toThrow(paginationErrors.INVALID_LIMIT);
            expect(() => calculatePagination(-5, 1, 100)).toThrow(paginationErrors.INVALID_LIMIT);
        });

        test('should throw badRequest if limit > 100', () => {
            expect(() => calculatePagination(101, 1, 100)).toThrow(
                paginationErrors.LIMIT_TOO_LARGE,
            );
        });

        test('should throw badRequest if page <= 0', () => {
            expect(() => calculatePagination(10, 0, 100)).toThrow(paginationErrors.INVALID_PAGE);
            expect(() => calculatePagination(10, -1, 100)).toThrow(paginationErrors.INVALID_PAGE);
        });
    });
});
