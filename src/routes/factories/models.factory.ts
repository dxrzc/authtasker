import { loadTasksModel } from 'src/models/tasks.model.load';
import { loadUserModel } from 'src/models/user.model.load';
import { ConfigService } from 'src/services/config.service';
import { Models } from 'src/types/models/models.type';

export function buildModels(configService: ConfigService): Models {
    return {
        userModel: loadUserModel(configService),
        tasksModel: loadTasksModel(configService),
    };
}
