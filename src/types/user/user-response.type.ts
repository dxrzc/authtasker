import { IUser } from '@root/interfaces/user/user.interface';

export type UserResponse = { [prop in keyof Omit<IUser, 'password'>]: any };