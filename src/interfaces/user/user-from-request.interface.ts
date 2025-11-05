import { UserRole } from 'src/enums/user-role.enum';

// user info obtained by roles middleware
export interface UserFromRequest {
    id: string;
    role: UserRole;
    sessionJti: string;
    sessionTokenExpUnix: number;
}
