import { LoggerService } from 'src/services/logger.service';
import { MongoDatabase } from 'src/databases/mongo/mongo.database';
import { teardownKit } from '@e2e/helpers/global-setup/teardownKit.helper';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { loadUserModel } from 'src/databases/mongo/models/user.model.load';
import { loadTasksModel } from 'src/databases/mongo/models/tasks.model.load';
import { removeAdminSessionTokenIfExists } from '@e2e/helpers/admin-token/remove-admin-session-token.helper';
import { RedisDatabase } from 'src/databases/redis/redis.database';

export default async () => {
    SystemLoggerService.info('Executing e2e teardown');

    const redisInstance = new RedisDatabase(teardownKit.configService);
    const mongoDatabase = new MongoDatabase(
        teardownKit.configService,
        null as unknown as LoggerService,
    );

    await mongoDatabase.connect();
    const redis = await redisInstance.connect();

    const userModel = loadUserModel(teardownKit.configService);
    const tasksModel = loadTasksModel(teardownKit.configService);

    await Promise.all([
        // delete all the users
        userModel.deleteMany({ email: { $ne: process.env.ADMIN_EMAIL } }),
        // delete all the tasks
        tasksModel.deleteMany(),
        // delete the whole redis database
        redis.flushdb(),
    ]);

    SystemLoggerService.info('All documents deleted except the administrator');
    removeAdminSessionTokenIfExists();

    await Promise.all([mongoDatabase.disconnect(), redisInstance.disconnect()]);
};
