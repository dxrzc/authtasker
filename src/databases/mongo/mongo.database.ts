import mongoose from "mongoose";
import { EventManager } from "@root/events/eventManager";
import { ConfigService } from '@root/services/config.service';
import { LoggerService } from '@root/services/logger.service';
import { SystemLoggerService } from '@root/services/system-logger.service';

export class MongoDatabase {

    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
    ) {
        if (configService.NODE_ENV === 'development' || configService.NODE_ENV === 'e2e') {
            this.listModelEvents('user');
            this.listModelEvents('task')
        }
    }

    async connect(): Promise<void> {        
        await mongoose.connect(this.configService.MONGO_URI);
        SystemLoggerService.info(`Connected to mongo database`)
    }

    async disconnect(): Promise<void> {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            SystemLoggerService.warn(`Disconnected from mongo database`)
        }
    }

    // for example: mongoose.userModel.save
    listModelEvents(model: string): void {
        EventManager.listen(`mongoose.${model}Model.save`, (property: string) => {
            this.loggerService.debug(`${model} "${property}" saved in db`);
        });

        EventManager.listen(`mongoose.${model}Model.findOne`, (property: string) => {
            this.loggerService.debug(`${model} "${property}" loaded from database`);
        });

        EventManager.listen(`mongoose.${model}Model.deleteOne`, () => {
            this.loggerService.debug(`${model} found removed from db`);
        });
    }
}