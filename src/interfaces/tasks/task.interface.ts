import { Types } from "mongoose";
import { TasksStatus } from "@root/types/tasks/task-status.type";
import { TasksPriority } from "@root/types/tasks/task-priority.type";

export interface ITasks {
    id: string;
    name: string;
    description: string;
    status: TasksStatus;
    priority: TasksPriority;
    user: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}