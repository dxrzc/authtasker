import { UserRole } from 'src/enums/user-role.enum';

// Represents the UserModel.
export interface IUser {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    role: UserRole;
    emailValidated: boolean;
    credentialsChangedAt: Date;
}
