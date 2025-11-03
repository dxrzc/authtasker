import { Request, Response } from "express";
import { UserService } from "src/services/user.service";
import { buildCacheOptions } from 'src/common/logic/cache/build-cache-options';
import { statusCodes } from 'src/common/constants/status-codes.constants';
import { paginationSettings } from 'src/common/constants/pagination.constants';
import { BaseUserController } from 'src/common/base/base-user-controller.class';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';
import { ForgotPasswordValidator } from 'src/validators/models/user/forgot-password.validator';
import { HttpError } from 'src/common/errors/classes/http-error.class';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { ResetPasswordValidator } from 'src/validators/models/user/reset-password.validator';

export class UserController extends BaseUserController {

    constructor(
        private readonly userService: UserService,
        private readonly createUserValidator: CreateUserValidator,
        private readonly updateUserValidator: UpdateUserValidator,
        private readonly loginUserValidator: LoginUserValidator,
        private readonly forgotPasswordValidator: ForgotPasswordValidator,
        private readonly resetPasswordValidator: ResetPasswordValidator,
    ) { super(); }

    protected readonly me = async (req: Request, res: Response): Promise<void> => {
        const { id } = this.getUserRequestInfo(req, res);
        const me = await this.userService.findOne(id, { noStore: true });
        res.status(statusCodes.OK).json(me);
    }

    protected readonly create = async (req: Request, res: Response): Promise<void> => {
        const user = req.body;
        const validUser = await this.createUserValidator.validateAndTransform(user);
        const created = await this.userService.create(validUser);
        res.status(statusCodes.CREATED).json(created);
    }

    protected readonly refresh = async (req: Request, res: Response): Promise<void> => {
        const tokens = await this.userService.refresh(req.body.refreshToken);
        res.status(statusCodes.OK).json(tokens);
    }

    protected readonly login = async (req: Request, res: Response): Promise<void> => {
        const user = req.body;
        const validUser = await this.loginUserValidator.validate(user);
        const loggedIn = await this.userService.login(validUser);
        res.status(statusCodes.OK).json(loggedIn);
    }

    protected readonly logout = async (req: Request, res: Response): Promise<void> => {
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const refreshToken = req.body.refreshToken;
        await this.userService.logout(requestUserInfo, refreshToken);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly logoutFromAll = async (req: Request, res: Response): Promise<void> => {
        const sanitizedCredentials = await this.loginUserValidator.validate(req.body);
        await this.userService.logoutFromAll(sanitizedCredentials);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly requestEmailValidation = async (req: Request, res: Response): Promise<void> => {
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.userService.requestEmailValidation(requestUserInfo.id);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly confirmEmailValidation = async (req: Request, res: Response): Promise<void> => {
        const token = req.params.token;
        await this.userService.confirmEmailValidation(token);
        res.status(statusCodes.OK).send({ message: 'Email successfully validated' });
    }

    protected readonly findOne = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        const cacheOptions = buildCacheOptions(req);
        const userFound = await this.userService.findOne(id, cacheOptions);
        res.status(statusCodes.OK).json(userFound);
    }

    protected readonly findAll = async (req: Request, res: Response): Promise<void> => {
        const limit = (req.query.limit) ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = (req.query.page) ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const cacheOptions = buildCacheOptions(req);
        const usersFound = await this.userService.findAll(limit, page, cacheOptions);
        res.status(statusCodes.OK).json(usersFound);
    }

    protected readonly deleteOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToDelete = req.params.id;
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.userService.deleteOne(requestUserInfo, userIdToDelete);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly updateOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToUpdate = req.params.id;
        const propertiesToUpdate = req.body;
        const validUpdate = await this.updateUserValidator.validateNewAndTransform(propertiesToUpdate);
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const updated = await this.userService.updateOne(requestUserInfo, userIdToUpdate, validUpdate);
        res.status(statusCodes.OK).json(updated);
    }

    protected readonly requestPasswordRecovery = async (req: Request, res: Response): Promise<void> => {
        const nameOrEmail = await this.forgotPasswordValidator.validate(req.body);
        await this.userService.requestPasswordRecovery(nameOrEmail);
        res.status(statusCodes.OK).send('If that account exists, you will receive an email.');
    }

    protected readonly resetPasswordd = async (req: Request, res: Response): Promise<void> => {
        const token = req.body.token;
        const rawPassword = req.body.newPassword;
        const { password } = await this.resetPasswordValidator.validate({ password: rawPassword });
        await this.userService.resetPassword(password, token);
        res.status(statusCodes.OK).send('Password successfully changed');
    }

    protected readonly resetPasswordForm = async (req: Request, res: Response): Promise<void> => {
        const { token } = req.query;
        if (!token)
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
        `
        );
    }
}