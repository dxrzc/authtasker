import mongoose from "mongoose";
import { EventManager } from "@root/events/eventManager";
import { ConfigService, LoggerService } from "@root/services";
import { SystemLoggerService } from "@root/services/system-logger.service";

export class MongoDatabase {

    constructor(        
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
    ) {
        if (configService.NODE_ENV === 'development' || configService.NODE_ENV === 'e2e') {
            this.listenConnectionEvents();        
            this.listModelEvents('user');
            this.listModelEvents('task')
        }
    }

    async connect(): Promise<void> {
        await mongoose.connect(this.configService.MONGO_URI);            
    }

    async disconnect(): Promise<void> {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
    }

    listenConnectionEvents(): void {
        mongoose.connection.on('connected', () => {
            SystemLoggerService.info(`Connected to mongo database`);
        });

        mongoose.connection.on('disconnected', () => {
            EventManager.emit('fatalServiceConnectionError');
            SystemLoggerService.error(`Disconnected from mongo database`);
        });

        mongoose.connection.on('error', (err) => {
            SystemLoggerService.error(`Mongoose connection error - ${err}`);
        });
    }

    // for example: mongoose.userModel.save
    listModelEvents(model: string): void {
        EventManager.listen(`mongoose.${model}Model.save`, (property: string) => {
            this.loggerService.debug(`${model} "${property}" saved in db`);
        });

        EventManager.listen(`mongoose.${model}Model.findOne`, (property: string) => {
            this.loggerService.debug(`${model} "${property}" found in db`);
        });

        EventManager.listen(`mongoose.${model}Model.deleteOne`, () => {
            this.loggerService.debug(`${model} found removed from db`);
        });
    }
}