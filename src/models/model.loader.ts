import { Model, model, Schema } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import { EventManager } from 'src/events/eventManager';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { IUser } from 'src/interfaces/user/user.interface';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { tasksPriority } from 'src/types/tasks/task-priority.type';
import { tasksStatus } from 'src/types/tasks/task-status.type';

type ModelLoaderOpts = {
    emitEvents: boolean;
};

export class ModelLoader {
    private static userModel: Model<IUser>;
    private static taskModel: Model<ITasks>;

    constructor(private readonly opts: ModelLoaderOpts) {
        if (!ModelLoader.userModel) ModelLoader.userModel = this.loadUserModel();
        if (!ModelLoader.taskModel) ModelLoader.taskModel = this.loadTaskModel();
    }

    get user() {
        return ModelLoader.userModel;
    }

    get task() {
        return ModelLoader.taskModel;
    }

    private loadUserModel() {
        const userSchema = new Schema<IUser>(
            {
                name: {
                    type: String,
                    required: true,
                    unique: true,
                },

                email: {
                    type: String,
                    required: true,
                    unique: true,
                },

                password: {
                    type: String,
                    required: true,
                },

                role: {
                    type: String,
                    required: true,
                    enum: Object.values(UserRole),
                    default: UserRole.READONLY,
                },

                emailValidated: {
                    type: Boolean,
                    default: false,
                },
            },
            {
                timestamps: true,
                toJSON: {
                    virtuals: true,
                    versionKey: false,
                    transform: function (doc, ret) {
                        delete ret._id;
                        delete ret.password;
                        return ret;
                    },
                },
            },
        );
        if (this.opts.emitEvents) {
            userSchema.post('findOne', (doc) => {
                if (doc) EventManager.emit('mongoose.userModel.findOne', doc.name);
            });

            userSchema.post('save', (doc) => {
                if (doc) EventManager.emit('mongoose.userModel.save', doc.name);
            });

            userSchema.post('deleteOne', (res) => {
                if (res) EventManager.emit('mongoose.userModel.deleteOne');
            });
        }
        const userModel = model<IUser>('user', userSchema);
        SystemLoggerService.info('User model loaded');
        return userModel;
    }

    private loadTaskModel() {
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
                    transform: function (doc, ret) {
                        delete ret._id;
                        return ret;
                    },
                },
            },
        );

        if (this.opts.emitEvents) {
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
    }
}
