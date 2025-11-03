import { IUser } from 'src/interfaces/user/user.interface';

/* Represents the data expected in request. Used in validation classes
Use with "Exact" type to get and immediately type error on files that work
with the request if one property is added or removed */
export type UserRequest = Omit<IUser, 'id' | 'createdAt' | 'updatedAt' | 'emailValidated' | 'role'>;
