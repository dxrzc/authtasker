import axios from 'axios';
import { e2eKit } from '@e2e/utils/e2eKit.util';
import { ConfigService } from '@root/services/config.service';
import { UserDataGenerator } from '@root/seed/generators/user.generator';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';
import { handleAxiosError } from '@e2e/utils/handle-axios-error.util';

beforeAll(() => {
    e2eKit.client = axios.create();

    // default error handler
    e2eKit.client.interceptors.response.use(
        (res) => res,
        (err) => handleAxiosError(err),
    );

    const configService = new ConfigService()
    e2eKit.configService = configService;
    e2eKit.userDataGenerator = new UserDataGenerator();
    e2eKit.tasksDataGenerator = new TasksDataGenerator();

    const webUrl = configService.WEB_URL;
    e2eKit.endpoints.usersAPI = `${webUrl}api/users`;
    e2eKit.endpoints.myProfile = `${webUrl}api/users/me`;
    e2eKit.endpoints.register = `${webUrl}api/users/register`;
    e2eKit.endpoints.login = `${webUrl}api/users/login`;
    e2eKit.endpoints.logout = `${webUrl}api/users/logout`;
    e2eKit.endpoints.requestEmailValidation = `${webUrl}api/users/requestEmailValidation`;
    e2eKit.endpoints.confirmEmailValidation = `${webUrl}api/users/confirmEmailValidation`;
    e2eKit.endpoints.tasksAPI = `${webUrl}api/tasks`;
    e2eKit.endpoints.createTask = `${webUrl}api/tasks/create`;
    e2eKit.endpoints.findAllTasksByUser = `${webUrl}api/tasks/allByUser`;
    e2eKit.endpoints.refreshToken = `${webUrl}api/users/refresh-token`;
    e2eKit.endpoints.health = `${webUrl}/health`;
});