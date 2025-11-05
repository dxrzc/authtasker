import { ModelLoader } from 'src/models/model.loader';
import { ConfigService } from 'src/services/config.service';
import { Models } from 'src/types/models/models.type';

export function buildModels(configService: ConfigService): Models {
    const moduleLoader = new ModelLoader({ emitEvents: configService.isDevelopment });
    return {
        userModel: moduleLoader.user,
        tasksModel: moduleLoader.task,
    };
}
