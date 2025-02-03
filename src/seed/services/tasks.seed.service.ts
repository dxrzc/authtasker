import { Model } from "mongoose";
import { ITasks } from "@root/interfaces/tasks/task.interface";
import { TasksDataGenerator } from "../generators/tasks.generator";
import { TaskRequest } from "@root/types/tasks/task-request.type";
import { ConfigService, LoggerService } from "@root/services";
import { IUser } from "@root/interfaces/user/user.interface";

export class TasksSeedService {

    constructor(
        private readonly tasksModel: Model<ITasks>,
        private readonly userModel: Model<IUser>,
        private readonly dataGenerator: TasksDataGenerator,
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
    ) {}

    private generateRandomTask(): TaskRequest {
        return {
            name: this.dataGenerator.name(),
            description: this.dataGenerator.description(),
            status: this.dataGenerator.status(),
            priority: this.dataGenerator.priority(),
        };
    }

    private async generateBunchOfTasks(n: number): Promise<TaskRequest[]> {
        let tasks = new Array<TaskRequest>();
        for (let i = 0; i < n; i++) {
            tasks.push(this.generateRandomTask());
        }
        return tasks;
    }

    async seedBunch(n: number) {
        await this.tasksModel.deleteMany({});
        this.loggerService.warn('All tasks deleted');

        const tasks = await this.generateBunchOfTasks(n);

        const adminUser = await this.userModel
            .findOne({ email: this.configService.ADMIN_EMAIL })
            .exec();

        if (!adminUser) {
            throw new Error('Admin user not found');
        }

        const adminId = adminUser.id;

        return await this.tasksModel
            .insertMany(tasks.map(task => ({ ...task, user: adminId })));
    }
}