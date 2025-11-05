import mongoose from 'mongoose';
import { EventManager } from 'src/events/eventManager';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { SystemLoggerService } from 'src/services/system-logger.service';

export class MongoDatabase {
    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
    ) {
        if (this.configService.isDevelopment) {
            this.listModelEvents('user');
            this.listModelEvents('task');
        }
        this.setupMongooseEventListeners();
    }

    async connect(): Promise<void> {
        await mongoose.connect(this.configService.MONGO_URI);
        SystemLoggerService.info(`Connected to mongo database`);
    }

    async disconnect(): Promise<void> {
        if (mongoose.connection.readyState === mongoose.ConnectionStates.connected)
            await mongoose.disconnect();
        SystemLoggerService.info(`Disconnected from mongo database`);
    }

    private setupMongooseEventListeners(): void {
        mongoose.connection.on('connected', () => {
            SystemLoggerService.info('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            SystemLoggerService.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            SystemLoggerService.info('Mongoose disconnected from MongoDB');
        });

        mongoose.connection.on('reconnected', () => {
            SystemLoggerService.info('Mongoose reconnected to MongoDB');
        });
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
