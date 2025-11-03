import { IUser } from 'src/interfaces/user/user.interface';

export type UserResponse = { [prop in keyof Omit<IUser, 'password'>]: any };
