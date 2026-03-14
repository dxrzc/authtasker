import { TasksFilters } from 'src/types/tasks/task-filters.type';

/**
 * @param filters Validated filters
 * @returns undefined if no filters provided (undefined values) otherwise the filter object
 */
export function buildFiltersObject(filters: TasksFilters): TasksFilters | undefined {
    const filterObj = new Object();
    for (const [key, value] of Object.entries(filters)) if (value) filterObj[key] = value;
    const emptyFilters = Object.keys(filterObj).length === 0;
    return emptyFilters ? undefined : filterObj;
}
