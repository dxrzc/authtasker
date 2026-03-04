export interface IShutdownParams {
    readonly cause: string;
    readonly exitCode: number;
    readonly stack?: string;
}
