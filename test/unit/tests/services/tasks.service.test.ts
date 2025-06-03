import { Model, Types } from "mongoose";
import { mock, MockProxy } from "jest-mock-extended";
import { ITasks } from "@root/interfaces";
import { LoggerService, TasksService, UserService } from "@root/services";
import { validRoles } from "@root/types/user";
import { modificationAuthFixture } from "./fixtures";

let loggerService: MockProxy<LoggerService>;
let tasksModel: MockProxy<Model<ITasks>>;
let userService: MockProxy<UserService>;
let tasksService: TasksService;

describe('Tasks Service', () => {
    beforeEach(() => {
        loggerService = mock<LoggerService>();
        tasksModel = mock<Model<ITasks>>();
        userService = mock<UserService>();
        tasksService = new TasksService(loggerService, tasksModel, userService);
    });

    describe('getTaskIfUserAuthorizedToModify', () => {
        test.each(
            validRoles
        )('%s users can modify their own tasks', async (role) => {
            const requestUserInfo = {
                role: role,
                id: new Types.ObjectId()
            };
            const task = {
                user: requestUserInfo.id,
                id: 'taskId'
            };
            // mock task found
            const findTask = jest.spyOn(tasksService, 'findOne').mockResolvedValue(task as any);
            // mock task owner found
            const findTaskOwnerMock = jest.spyOn(userService, 'findOne').mockResolvedValue(requestUserInfo as any);
            const result = await tasksService['getTaskIfUserAuthorizedToModify'](requestUserInfo as any, task.id);
            expect(findTaskOwnerMock).toHaveBeenCalledTimes(1);
            expect(findTask).toHaveBeenCalledTimes(1);
            expect(result).toStrictEqual(task);
        });

        test.each(
            modificationAuthFixture
        )('$currentUserRole users are $expected to modify tasks owned by $targetUserRole users', async ({
            currentUserRole,
            targetUserRole,
            expected
        }) => {
            const requestUserInfo = {
                role: currentUserRole,
                id: 'requestUserId'
            };
            const taskOwner = {
                role: targetUserRole,
                id: 'targetUserId'
            };
            const task = {
                user: new Types.ObjectId(taskOwner.id),
                id: 'taskId'
            };

            // mock task found
            const findTaskMock = jest.spyOn(tasksService, 'findOne').mockResolvedValue(task as any);
            // mock task owner found
            const findTaskOwner = jest.spyOn(userService, 'findOne').mockResolvedValue(taskOwner as any);
            const result = await tasksService['getTaskIfUserAuthorizedToModify'](requestUserInfo, task.id);
            expect(findTaskMock).toHaveBeenCalledTimes(1);
            expect(findTaskOwner).toHaveBeenCalledTimes(1);
            expected === 'authorized'
                ? expect(result).toStrictEqual(task)
                : expect(result).toBeNull();
        });
    });
});