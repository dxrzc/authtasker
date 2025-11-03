import mongoose from 'mongoose';
import { EventManager } from 'src/events/eventManager';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { Events } from 'src/common/constants/events.constants';

export class MongoDatabase {
    private disconnectedManually = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
    ) {
        if (configService.NODE_ENV === 'development' || configService.NODE_ENV === 'e2e') {
            this.listModelEvents('user');
            this.listModelEvents('task');
        }
        this.connectionEvents();
    }

    async connect(): Promise<void> {
        await mongoose.connect(this.configService.MONGO_URI);
        SystemLoggerService.info(`Connected to mongo database`);
    }

    async disconnect(): Promise<void> {
        if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
            await mongoose.disconnect();
            this.disconnectedManually = true;
            SystemLoggerService.warn(`Disconnected from mongo database`);
        }
    }

    connectionEvents() {
        mongoose.connection.on('disconnected', () => {
            if (!this.disconnectedManually) EventManager.emit(Events.MONGO_CONNECTION_ERROR);
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
