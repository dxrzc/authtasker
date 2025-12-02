import { Request, Response } from 'express';
import { UserService } from 'src/services/user.service';
import { statusCodes } from 'src/constants/status-codes.constants';
import { paginationSettings } from 'src/constants/pagination.constants';
import { LoginUserDto } from 'src/dtos/models/user/login-user.dto';
import { CreateUserDto } from 'src/dtos/models/user/create-user.dto';
import { UpdateUserDto } from 'src/dtos/models/user/update-user.dto';
import { PasswordRecoveryDto } from 'src/dtos/models/user/password-recovery.dto';
import { HttpError } from 'src/errors/http-error.class';
import { authErrors } from 'src/messages/auth.error.messages';
import { ResetPasswordDto } from 'src/dtos/models/user/reset-password.dto';
import { userInfoInReq } from 'src/functions/express/user-info-in-req';
import { LoggerService } from 'src/services/logger.service';
import { authSuccessMessages } from 'src/messages/auth.success.messages';
import { PasswordReauthenticationDto } from 'src/dtos/models/user/password-reauthentication.dto';

export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly loggerService: LoggerService,
    ) {}

    public readonly me = async (req: Request, res: Response): Promise<void> => {
        const { id } = userInfoInReq(req);
        const me = await this.userService.findOne(id, { cache: true });
        res.status(statusCodes.OK).json(me);
    };

    public readonly create = async (req: Request, res: Response): Promise<void> => {
        const user = req.body;
        const validUser = await CreateUserDto.validateAndTransform(user);
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
        const validUser = await LoginUserDto.validate(user);
        const loggedIn = await this.userService.login(validUser);
        res.status(statusCodes.OK).json(loggedIn);
    };

    public readonly logout = async (req: Request, res: Response): Promise<void> => {
        if (!req.body || !req.body.refreshToken) {
            this.loggerService.error('Refresh token was not in body');
            throw HttpError.badRequest(authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY);
        }
        const userSessionInfo = userInfoInReq(req);
        await this.userService.logout(userSessionInfo, req.body.refreshToken);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly logoutAll = async (req: Request, res: Response): Promise<void> => {
        const { password } = await PasswordReauthenticationDto.validate(req.body);
        await this.userService.logoutAll(password, userInfoInReq(req));
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly requestEmailValidation = async (req: Request, res: Response): Promise<void> => {
        const userSessionInfo = userInfoInReq(req);
        await this.userService.requestEmailValidation(userSessionInfo);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly confirmEmailValidation = async (req: Request, res: Response): Promise<void> => {
        const token = req.query.token;
        if (!token || typeof token !== 'string') {
            this.loggerService.error('Invalid email validation token in query');
            throw HttpError.badRequest(authErrors.INVALID_TOKEN);
        }
        await this.userService.confirmEmailValidation(token);
        res.status(statusCodes.OK).send({
            message: authSuccessMessages.EMAIL_VALIDATED_SUCCESSFULLY,
        });
    };

    public readonly findOne = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        const userFound = await this.userService.findOne(id, { cache: true });
        res.status(statusCodes.OK).json(userFound);
    };

    public readonly findAll = async (req: Request, res: Response): Promise<void> => {
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const usersFound = await this.userService.findAll(limit, page);
        res.status(statusCodes.OK).json(usersFound);
    };

    public readonly deleteOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToDelete = req.params.id;
        const userSessionInfo = userInfoInReq(req);
        await this.userService.deleteOne(userSessionInfo, userIdToDelete);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly updateOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToUpdate = req.params.id;
        const propertiesToUpdate = req.body;
        const validUpdate = await UpdateUserDto.validateAndTransform(propertiesToUpdate);
        const userSessionInfo = userInfoInReq(req);
        const updated = await this.userService.updateOne(
            userSessionInfo,
            userIdToUpdate,
            validUpdate,
        );
        res.status(statusCodes.OK).json(updated);
    };

    public readonly requestPasswordRecovery = async (
        req: Request,
        res: Response,
    ): Promise<void> => {
        const { email } = await PasswordRecoveryDto.validate(req.body);
        await this.userService.requestPasswordRecovery(email);
        res.status(statusCodes.OK).send({
            message: authSuccessMessages.PASSWORD_RECOVERY_REQUESTED,
        });
    };

    public readonly resetPassword = async (req: Request, res: Response): Promise<void> => {
        const token = req.body.token;
        if (!token || typeof token !== 'string') {
            this.loggerService.error('Invalid password recovery token in body');
            throw HttpError.badRequest(authErrors.INVALID_TOKEN);
        }
        const rawPassword = req.body.newPassword;
        const { password } = await ResetPasswordDto.validate({ password: rawPassword });
        await this.userService.resetPassword(password, token);
        res.status(statusCodes.OK).send({
            message: authSuccessMessages.PASSWORD_RESET_SUCCESS,
        });
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
