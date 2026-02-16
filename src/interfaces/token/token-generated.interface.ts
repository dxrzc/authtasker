export interface ITokenGenerated {
    readonly token: string;
    readonly jti: string;
    readonly expUnix: number;
}
