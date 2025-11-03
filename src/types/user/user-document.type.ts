import { HydratedDocument } from 'mongoose';
import { IUser } from 'src/interfaces/user/user.interface';

export type UserDocument = HydratedDocument<IUser>;
