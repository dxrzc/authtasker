export interface IPagination<T> {
    readonly totalDocuments: number;
    readonly totalPages: number;
    readonly currentPage: number;
    readonly data: readonly T[];
}
