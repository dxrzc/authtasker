import { buildFiltersObject } from 'src/functions/tasks/build-filters';
import { TasksFilters } from 'src/types/tasks/task-filters.type';

describe('buildFilters', () => {
    describe('Only undefined filters provided', () => {
        test('return undefined', () => {
            const filters = {
                status: undefined,
                priority: undefined,
            };
            const filtersObj = buildFiltersObject(filters);
            expect(filtersObj).toBeUndefined();
        });
    });

    describe('Filters provided', () => {
        test('return object with filters', () => {
            const filters: TasksFilters = {
                status: 'completed',
                priority: 'high',
            };
            const filtersObj = buildFiltersObject(filters);
            expect(filtersObj).toStrictEqual(filters);
        });
    });

    describe('Only a filter is undefined', () => {
        test('return object containing only the existing filter', () => {
            const filters: TasksFilters = {
                status: 'completed',
            };
            const filtersObj = buildFiltersObject(filters);
            expect(filtersObj).toStrictEqual(filters);
        });
    });
});
