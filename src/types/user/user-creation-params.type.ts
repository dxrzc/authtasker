import { IUser } from 'src/interfaces/user/user.interface';

export type UserCreationParams = Omit<
    IUser,
    'id' | 'createdAt' | 'updatedAt' | 'emailValidated' | 'role' | 'credentialsChangedAt'
>;
