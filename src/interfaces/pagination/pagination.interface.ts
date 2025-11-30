export interface IPagination<T> {
    totalDocuments: number;
    totalPages: number;
    currentPage: number;
    data: T[];
}
