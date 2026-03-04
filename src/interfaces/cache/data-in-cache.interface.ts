export interface DataInCache<T> {
    readonly data: T;
    readonly cachedAtUnix: number;
}
