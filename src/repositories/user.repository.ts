import { ClientSession, Model } from 'mongoose';
import { IUser } from 'src/interfaces/user/user.interface';
import { UserDocument } from 'src/types/user/user-document.type';
import { UserCreationParams } from 'src/types/user/user-creation-params.type';
import { UserRole } from 'src/enums/user-role.enum';
import { Repository } from './repository';

export class UserRepository extends Repository<IUser> {
    constructor(private readonly userModel: Model<IUser>) {
        super(userModel);
    }

    async findByName(name: string): Promise<UserDocument | null> {
        return await this.userModel.findOne({ name }).exec();
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return await this.userModel.findOne({ email }).exec();
    }

    async createAdmin(data: UserCreationParams) {
        return await this.userModel.create({
            ...data,
            role: UserRole.ADMIN,
            emailValidated: true,
        });
    }

    async create(user: UserCreationParams): Promise<UserDocument> {
        return await this.userModel.create(user);
    }

    async deleteOneTx(id: string, session: ClientSession): Promise<number> {
        const { deletedCount } = await this.userModel.deleteOne({ _id: id }, { session }).exec();
        return deletedCount;
    }
}
