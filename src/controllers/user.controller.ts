import { Request, Response } from 'express';
import { UserService } from 'src/services/user.service';
import { buildCacheOptions } from 'src/functions/cache/build-cache-options';
import { statusCodes } from 'src/constants/status-codes.constants';
import { paginationSettings } from 'src/constants/pagination.constants';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';
import { ForgotPasswordValidator } from 'src/validators/models/user/forgot-password.validator';
import { HttpError } from 'src/errors/http-error.class';
import { authErrors } from 'src/messages/auth.error.messages';
import { ResetPasswordValidator } from 'src/validators/models/user/reset-password.validator';
import { userInfoInReq } from 'src/functions/express/user-info-in-req';
import { LoggerService } from 'src/services/logger.service';
import { authSuccessMessages } from 'src/messages/auth.success.messages';

export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly createUserValidator: CreateUserValidator,
        private readonly updateUserValidator: UpdateUserValidator,
        private readonly loginUserValidator: LoginUserValidator,
        private readonly forgotPasswordValidator: ForgotPasswordValidator,
        private readonly resetPasswordValidator: ResetPasswordValidator,
        private readonly loggerService: LoggerService,
    ) {}

    public readonly me = async (req: Request, res: Response): Promise<void> => {
        const { id } = userInfoInReq(req);
        const me = await this.userService.findOne(id, { noStore: true });
        res.status(statusCodes.OK).json(me);
    };

    public readonly create = async (req: Request, res: Response): Promise<void> => {
        const user = req.body;
        const validUser = await this.createUserValidator.validateAndTransform(user);
        const created = await this.userService.create(validUser);
        res.status(statusCodes.CREATED).json(created);
    };

    public readonly refresh = async (req: Request, res: Response): Promise<void> => {
        if (!req.body || !req.body.refreshToken) {
            this.loggerService.error('Refresh token was not in body');
            throw HttpError.badRequest(authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY);
        }
        const tokens = await this.userService.refresh(req.body.refreshToken);
        res.status(statusCodes.OK).json(tokens);
    };

    public readonly login = async (req: Request, res: Response): Promise<void> => {
        const user = req.body;
        const validUser = await this.loginUserValidator.validate(user);
        const loggedIn = await this.userService.login(validUser);
        res.status(statusCodes.OK).json(loggedIn);
    };

    public readonly logout = async (req: Request, res: Response): Promise<void> => {
        if (!req.body || !req.body.refreshToken) {
            this.loggerService.error('Refresh token was not in body');
            throw HttpError.badRequest(authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY);
        }
        const requestUserInfo = userInfoInReq(req);
        await this.userService.logout(requestUserInfo, req.body.refreshToken);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly logoutFromAll = async (req: Request, res: Response): Promise<void> => {
        const sanitizedCredentials = await this.loginUserValidator.validate(req.body);
        await this.userService.logoutFromAll(sanitizedCredentials);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly requestEmailValidation = async (req: Request, res: Response): Promise<void> => {
        const requestUserInfo = userInfoInReq(req);
        await this.userService.requestEmailValidation(requestUserInfo.id);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly confirmEmailValidation = async (req: Request, res: Response): Promise<void> => {
        const token = req.params.token;
        await this.userService.confirmEmailValidation(token);
        res.status(statusCodes.OK).send({ message: 'Email successfully validated' });
    };

    public readonly findOne = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        const cacheOptions = buildCacheOptions(req);
        const userFound = await this.userService.findOne(id, cacheOptions);
        res.status(statusCodes.OK).json(userFound);
    };

    public readonly findAll = async (req: Request, res: Response): Promise<void> => {
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const cacheOptions = buildCacheOptions(req);
        const usersFound = await this.userService.findAll(limit, page, cacheOptions);
        res.status(statusCodes.OK).json(usersFound);
    };

    public readonly deleteOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToDelete = req.params.id;
        const requestUserInfo = userInfoInReq(req);
        await this.userService.deleteOne(requestUserInfo, userIdToDelete);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly updateOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToUpdate = req.params.id;
        const propertiesToUpdate = req.body;
        const validUpdate =
            await this.updateUserValidator.validateNewAndTransform(propertiesToUpdate);
        const requestUserInfo = userInfoInReq(req);
        const updated = await this.userService.updateOne(
            requestUserInfo,
            userIdToUpdate,
            validUpdate,
        );
        res.status(statusCodes.OK).json(updated);
    };

    public readonly requestPasswordRecovery = async (
        req: Request,
        res: Response,
    ): Promise<void> => {
        const nameOrEmail = await this.forgotPasswordValidator.validate(req.body);
        await this.userService.requestPasswordRecovery(nameOrEmail);
        res.status(statusCodes.OK).send('If that account exists, you will receive an email.');
    };

    public readonly resetPasswordd = async (req: Request, res: Response): Promise<void> => {
        const token = req.body.token;
        const rawPassword = req.body.newPassword;
        const { password } = await this.resetPasswordValidator.validate({ password: rawPassword });
        await this.userService.resetPassword(password, token);
        res.status(statusCodes.OK).send(authSuccessMessages.PASSWORD_RESET_SUCCESS);
    };

    public readonly resetPasswordForm = async (req: Request, res: Response): Promise<void> => {
        const { token } = req.query;
        if (!token || typeof token !== 'string')
            throw HttpError.badRequest(authErrors.INVALID_TOKEN);

        res.send(`
          <html>
            <body>
              <h2>Reset your password</h2>
              <form method="POST" action="/api/users/reset-password">
                <input type="hidden" name="token" value="${token}" />
                <label>New Password:</label>
                <input type="password" name="newPassword" required />
                <button type="submit">Reset Password</button>
              </form>
            </body>
          </html>
        `);
        return Promise.resolve();
    };
}
