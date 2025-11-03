import { Request, RequestHandler, Response } from 'express';
import { BaseController } from './base-controller.class';

export abstract class BaseUserController extends BaseController {
    protected abstract create(req: Request, res: Response): Promise<void>;
    protected abstract login(req: Request, res: Response): Promise<void>;
    protected abstract logout(req: Request, res: Response): Promise<void>;
    protected abstract logoutFromAll(req: Request, res: Response): Promise<void>;
    protected abstract requestEmailValidation(req: Request, res: Response): Promise<void>;
    protected abstract confirmEmailValidation(req: Request, res: Response): Promise<void>;
    protected abstract findOne(req: Request, res: Response): Promise<void>;
    protected abstract findAll(req: Request, res: Response): Promise<void>;
    protected abstract deleteOne(req: Request, res: Response): Promise<void>;
    protected abstract updateOne(req: Request, res: Response): Promise<void>;
    protected abstract me(req: Request, res: Response): Promise<void>;
    protected abstract refresh(req: Request, res: Response): Promise<void>;
    protected abstract requestPasswordRecovery(req: Request, res: Response): Promise<void>;
    protected abstract resetPasswordd(req: Request, res: Response): Promise<void>;
    protected abstract resetPasswordForm(req: Request, res: Response): Promise<void>;

    readonly resetPasswordFormFwdErr = (): RequestHandler =>
        this.forwardError(this.resetPasswordForm.bind(this));
    readonly resetPasswordFwdErr = (): RequestHandler =>
        this.forwardError(this.resetPasswordd.bind(this));
    readonly requestPasswordRecoveryFwdErr = (): RequestHandler =>
        this.forwardError(this.requestPasswordRecovery.bind(this));
    readonly createFwdErr = (): RequestHandler => this.forwardError(this.create.bind(this));
    readonly loginFwdErr = (): RequestHandler => this.forwardError(this.login.bind(this));
    readonly logoutFwdErr = (): RequestHandler => this.forwardError(this.logout.bind(this));
    readonly logoutFromAllFwdErr = (): RequestHandler =>
        this.forwardError(this.logoutFromAll.bind(this));
    readonly requestEmailValidationFwdErr = (): RequestHandler =>
        this.forwardError(this.requestEmailValidation.bind(this));
    readonly confirmEmailValidationFwdErr = (): RequestHandler =>
        this.forwardError(this.confirmEmailValidation.bind(this));
    readonly findOneFwdErr = (): RequestHandler => this.forwardError(this.findOne.bind(this));
    readonly findAllFwdErr = (): RequestHandler => this.forwardError(this.findAll.bind(this));
    readonly deleteOneFwdErr = (): RequestHandler => this.forwardError(this.deleteOne.bind(this));
    readonly updateOneFwdErr = (): RequestHandler => this.forwardError(this.updateOne.bind(this));
    readonly meFwdErr = (): RequestHandler => this.forwardError(this.me.bind(this));
    readonly refreshFwdErr = (): RequestHandler => this.forwardError(this.refresh.bind(this));
}
