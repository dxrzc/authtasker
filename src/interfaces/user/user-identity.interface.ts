import { UserRole } from 'src/enums/user-role.enum';

export interface UserIdentity {
    role: UserRole;
    id: string;
}
