import { UserRole } from 'src/types/user/user-roles.type';

export interface UserIdentity {
    role: UserRole,
    id: string;
}