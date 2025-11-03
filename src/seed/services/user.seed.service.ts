import { Model } from 'mongoose';
import { IUser } from 'src/interfaces/user/user.interface';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { HashingService } from 'src/services/hashing.service';
import { UserDataGenerator } from '../generators/user.generator';
import { UserRequest } from 'src/types/user/user-request.type';

export class UserSeedService {
    constructor(
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly hashingService: HashingService,
        private readonly dataGenerator: UserDataGenerator,
        private readonly loggerService: LoggerService,
    ) {}

    private async generateRandomUser(): Promise<UserRequest> {
        return {
            name: this.dataGenerator.name(),
            email: this.dataGenerator.email(),
            password: await this.hashingService.hash(this.dataGenerator.password()),
        };
    }

    private returnRandomRole(): string {
        const roles = ['editor', 'readonly'];
        const n = Math.floor(Math.random() * roles.length);
        return roles[n];
    }

    private async generateBunchOfUsers(n: number): Promise<UserRequest[]> {
        const users = new Array<UserRequest>();
        for (let i = 0; i < n; i++) {
            users.push(await this.generateRandomUser());
        }
        return users;
    }

    async seedBunch(n: number) {
        await this.userModel.deleteMany({ email: { $ne: this.configService.ADMIN_EMAIL } });
        this.loggerService.warn('All users deleted, except admin');

        const users = await this.generateBunchOfUsers(n);
        const usersWithRole = users.map((user) => ({ ...user, role: this.returnRandomRole() }));

        return await this.userModel.insertMany(usersWithRole);
    }
}
