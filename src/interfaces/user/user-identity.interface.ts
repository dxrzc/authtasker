import { UserRole } from 'src/enums/user-role.enum';

export interface UserIdentity {
    readonly role: UserRole;
    readonly id: string;
}
