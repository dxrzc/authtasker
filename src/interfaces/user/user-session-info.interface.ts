import { UserRole } from 'src/enums/user-role.enum';

// User information attached to request after authentication
export interface UserSessionInfo {
    id: string;
    email: string;
    role: UserRole;
    sessionJti: string;
    sessionTokenExpUnix: number;
}
