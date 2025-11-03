import { Model, model, Schema } from 'mongoose';
import { EventManager } from 'src/events/eventManager';
import { ConfigService } from 'src/services/config.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { tasksStatus } from 'src/types/tasks/task-status.type';
import { tasksPriority } from 'src/types/tasks/task-priority.type';
import { SystemLoggerService } from 'src/services/system-logger.service';

export const loadTasksModel = (configService: ConfigService): Model<ITasks> => {
    const tasksSchema = new Schema<ITasks>(
        {
            name: {
                type: String,
                required: true,
                unique: true,
            },
            description: {
                type: String,
                required: true,
            },
            status: {
                type: String,
                required: true,
                enum: tasksStatus,
            },
            priority: {
                type: String,
                required: true,
                enum: tasksPriority,
            },
            user: {
                type: Schema.Types.ObjectId,
                ref: 'user',
                required: true,
            },
        },
        {
            timestamps: true,
            toJSON: {
                virtuals: true,
                versionKey: false,
                transform: function (doc, ret, options) {
                    delete ret._id;
                    return ret;
                },
            },
        },
    );

    if (configService.HTTP_LOGS) {
        tasksSchema.post('findOne', (doc) => {
            if (doc) EventManager.emit('mongoose.taskModel.findOne', doc.name);
        });

        tasksSchema.post('save', (doc) => {
            if (doc) EventManager.emit('mongoose.taskModel.save', doc.name);
        });

        tasksSchema.post('deleteOne', (doc) => {
            if (doc) EventManager.emit('mongoose.taskModel.deleteOne');
        });
    }

    const tasksModel = model<ITasks>('tasks', tasksSchema);
    SystemLoggerService.info('Tasks model loaded');

    return tasksModel;
};
