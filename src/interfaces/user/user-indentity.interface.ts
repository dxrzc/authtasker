import { UserRole } from '@root/types/user/user-roles.type';

export interface UserIdentity {
    role: UserRole,
    id: string;
}