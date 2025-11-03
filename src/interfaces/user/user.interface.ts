import { UserRole } from 'src/types/user/user-roles.type';

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
}
