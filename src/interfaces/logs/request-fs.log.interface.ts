// Defines the request log in fs
export interface IRequestFsLog {
    method: string;
    requestId: string;
    responseTime: number;
    statusCode: number;
    url: string;
    ip: string;
    // Properties added by winston
    // level: string;
    // message: string;
    // timestamp: string;
}
