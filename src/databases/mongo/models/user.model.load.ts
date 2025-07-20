import { model, Schema, Model } from "mongoose";
import { EventManager } from "@root/events/eventManager";
import { IUser } from '@root/interfaces/user/user.interface';
import { ConfigService } from '@root/services/config.service';
import { validRoles } from '@root/types/user/user-roles.type';
import { SystemLoggerService } from '@root/services/system-logger.service';

export const loadUserModel = (configService: ConfigService): Model<IUser> => {
    const userSchema = new Schema<IUser>({
        name: {
            type: String,
            required: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            required: true,
            enum: validRoles,
            default: 'readonly'
        },

        emailValidated: {
            type: Boolean,
            default: false,
        }
    }, {
        timestamps: true,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform: function (doc, ret, options) {
                delete ret._id;
                delete ret.password;
                return ret;
            }
        }
    });

    if (configService.HTTP_LOGS) {
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
};