import { Model } from 'mongoose';
import { IUser } from 'src/interfaces/user/user.interface';
import { ConfigService } from 'src/services/config.service';
import { HashingService } from 'src/services/hashing.service';
import { SystemLoggerService } from 'src/services/system-logger.service';

export const createAdmin = async (
    userModel: Model<IUser>,
    configService: ConfigService,
    hashingService: HashingService,
) => {
    try {
        // TODO: Admin creation is incorrect since the password is not hashed correctly with pre-hashing
        // consider moving this logic to a proper user service
        const alreadyExists = await userModel.findOne({ name: configService.ADMIN_NAME }).exec();
        if (!alreadyExists) {
            const admin = await userModel.create({
                name: configService.ADMIN_NAME,
                email: configService.ADMIN_EMAIL,
                password: await hashingService.hash(configService.ADMIN_PASSWORD),
                role: 'admin',
                emailValidated: true,
            });
            const adminId = admin._id.toString();
            SystemLoggerService.info(`Admin ${adminId} created successfully`);
        } else {
            SystemLoggerService.info(`Admin user creation omitted, already exists`);
        }
    } catch (error) {
        SystemLoggerService.error(error);
        process.exit(1);
    }
};
