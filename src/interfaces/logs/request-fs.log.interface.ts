// Defines the request log in fs
export interface IRequestFsLog {
    readonly method: string;
    readonly requestId: string;
    readonly responseTime: number;
    readonly statusCode: number;
    readonly url: string;
    readonly ip: string;
    // Properties added by winston
    // level: string;
    // message: string;
    // timestamp: string;
}
