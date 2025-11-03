import { IUser } from 'src/interfaces/user/user.interface';

/* Represents the data to be saved in db. Used to define userSchema*/
export type UserInDb = { [prop in keyof Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>]: object };
