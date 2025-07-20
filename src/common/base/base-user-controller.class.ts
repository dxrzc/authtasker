import { Request, RequestHandler, Response } from 'express'
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

    readonly createFwdErr = (): RequestHandler => this.forwardError(this.create);
    readonly loginFwdErr = (): RequestHandler => this.forwardError(this.login);
    readonly logoutFwdErr = (): RequestHandler => this.forwardError(this.logout);
    readonly logoutFromAllFwdErr = (): RequestHandler => this.forwardError(this.logoutFromAll);
    readonly requestEmailValidationFwdErr = (): RequestHandler => this.forwardError(this.requestEmailValidation);
    readonly confirmEmailValidationFwdErr = (): RequestHandler => this.forwardError(this.confirmEmailValidation);
    readonly findOneFwdErr = (): RequestHandler => this.forwardError(this.findOne);
    readonly findAllFwdErr = (): RequestHandler => this.forwardError(this.findAll);
    readonly deleteOneFwdErr = (): RequestHandler => this.forwardError(this.deleteOne);
    readonly updateOneFwdErr = (): RequestHandler => this.forwardError(this.updateOne);
    readonly meFwdErr = (): RequestHandler => this.forwardError(this.me);
    readonly refreshFwdErr = (): RequestHandler => this.forwardError(this.refresh);
}
