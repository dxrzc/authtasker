import { RequestHandler } from 'express';
import { BaseHttpComponent } from './base-http-component';

// Args represents the type of arguments that the middleware handler can accept.
// Always use middleware(...) to get the middleware so the function is wrapped with error handling.
export abstract class BaseMiddleware<Args extends any[] = []> extends BaseHttpComponent {
    protected abstract getHandler(...args: Args): RequestHandler;

    middleware(...args: Args): RequestHandler {
        return this.forwardError(this.getHandler(...args));
    }
}