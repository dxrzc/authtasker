import { Model, Query } from 'mongoose';
import { mock } from 'jest-mock-extended';
import { IUser } from '@root/interfaces';
import { HttpError } from '@root/rules/errors/http.error';
import { paginationRules } from '@logic/others';

describe('paginationRules', () => {
    const userModel = mock<Model<IUser>>()
    beforeAll(() => {
        userModel.countDocuments.mockReturnValue(mock<Query<any, any>>());
    });

    test('throws Bad Request Http Error if limit is less than or equal to 0', async () => {
        const badLimit = Math.random() < 0.5 ? 0 : -1;
        try {
            await paginationRules(badLimit, 1, userModel);
        } catch (error: any) {
            expect(error).toBeInstanceOf(HttpError);
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Limit must be a valid number');
        }
    });

    test('throws Bad Request Http Error if limit is greater than 100', async () => {
        try {
            await paginationRules(101, 1, userModel);
        } catch (error: any) {
            expect(error).toBeInstanceOf(HttpError);
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Limit is too large');
        }
    });

    test('returns an empty array if there are no documents', async () => {
        (userModel.countDocuments().exec as any).mockResolvedValue(0);
        const result = await paginationRules(10, 1, userModel);
        expect(result).toEqual([]);
    });

    test('throws Bad Request Http Error if page is less than or equal to 0', async () => {
        (userModel.countDocuments().exec as any).mockResolvedValue(10);
        const badPage = Math.random() < 0.5 ? 0 : -2;
        try {
            await paginationRules(5, badPage, userModel);
        } catch (error: any) {
            expect(error).toBeInstanceOf(HttpError);
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Page must be a valid number');
        }
    });

    test('throws Bad Request Http Error if page exceeds total pages', async () => {
        (userModel.countDocuments().exec as any).mockResolvedValue(10); // totalPages = 2
        try {
            await paginationRules(5, 3, userModel); // page > 2
        } catch (error: any) {
            expect(error).toBeInstanceOf(HttpError);
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe('Invalid page');
        }
    });

    test('returns correct offset if limit and page are valid', async () => {
        (userModel.countDocuments().exec as any).mockResolvedValue(50); // totalPages = 5
        const offset = await paginationRules(10, 3, userModel); // page 3 → offset 20
        expect(offset).toBe(20);
    });
});
