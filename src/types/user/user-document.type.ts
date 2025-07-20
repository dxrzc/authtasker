import { HydratedDocument } from 'mongoose';
import { IUser } from '@root/interfaces/user/user.interface';

export type UserDocument = HydratedDocument<IUser>;