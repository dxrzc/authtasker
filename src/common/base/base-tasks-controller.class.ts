import { Request, RequestHandler, Response } from 'express';
import { BaseController } from './base-controller.class';

export abstract class BaseTasksController extends BaseController {
    protected abstract create(req: Request, res: Response): Promise<void>;
    protected abstract findOne(req: Request, res: Response): Promise<void>;
    protected abstract findAll(req: Request, res: Response): Promise<void>;
    protected abstract findAllByUser(req: Request, res: Response): Promise<void>;
    protected abstract deleteOne(req: Request, res: Response): Promise<void>;
    protected abstract updateOne(req: Request, res: Response): Promise<void>;

    readonly createFwdErr = (): RequestHandler => this.forwardError(this.create);
    readonly findOneFwdErr = (): RequestHandler => this.forwardError(this.findOne);
    readonly findAllFwdErr = (): RequestHandler => this.forwardError(this.findAll);
    readonly findAllByUserFwdErr = (): RequestHandler => this.forwardError(this.findAllByUser);
    readonly deleteOneFwdErr = (): RequestHandler => this.forwardError(this.deleteOne);
    readonly updateOneFwdErr = (): RequestHandler => this.forwardError(this.updateOne);
}
