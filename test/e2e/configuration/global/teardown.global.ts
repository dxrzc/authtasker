import { loadUserModel } from "@root/databases/mongo/models/user.model.load";
import { MongoDatabase } from "@root/databases/mongo/mongo.database"
import { SystemLoggerService } from "@root/services/system-logger.service";
import { removeAdminTokenIfExists } from "../../helpers/admin/token/remove-admin-token.helper";

export default async () => {
    SystemLoggerService.info('E2E global teardown');

    // Remove all documents from mongo database
    const mongoDatabase = new MongoDatabase(
        global.CONFIG_SERVICE,
        null as any,
    );
    await mongoDatabase.connect();

    const userModel = loadUserModel({} as any);
    await userModel.deleteMany({ email: { $ne: process.env.ADMIN_EMAIL } });
    SystemLoggerService.warn('All db documents deleted (but admin)');

    await mongoDatabase.disconnect();

    // Remove the admin's token obtained in globalSetup
    removeAdminTokenIfExists();
}