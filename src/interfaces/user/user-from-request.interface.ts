import { UserRole } from 'src/types/user/user-roles.type';

// user info obtained by roles middleware
export interface UserFromRequest {
    id: string;
    role: UserRole;
    sessionJti: string;
    sessionTokenExpUnix: number;
}
