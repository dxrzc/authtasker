import { UserRole } from 'src/enums/user-role.enum';

// User information attached to request after authentication
export interface UserSessionInfo {
    readonly id: string;
    readonly email: string;
    readonly role: UserRole;
    readonly sessionJti: string;
    readonly sessionTokenExpUnix: number;
}
