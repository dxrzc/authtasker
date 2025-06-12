import { BaseMiddleware } from '@root/common/base/base-middleware.class';
import { Request, Response, RequestHandler } from 'express';

describe('BaseMiddleware', () => {
    class TestMiddleware extends BaseMiddleware<[string]> {
        public getHandlerCalledWith: string | null = null;

        protected getHandler(param: string): RequestHandler {
            this.getHandlerCalledWith = param;
            return (req, res, next) => {
                res.send(`Handled: ${param}`);
            };
        }
    }

    it('calls getHandler with correct args and wraps it in forwardError', () => {
        const middleware = new TestMiddleware();
        const spy = jest.spyOn(middleware as any, 'forwardError');

        const handler = middleware.middleware('TEST');

        expect(middleware.getHandlerCalledWith).toBe('TEST');
        expect(spy).toHaveBeenCalledTimes(1);
        expect(typeof handler).toBe('function');
    });

    it('returns a middleware that handles sync errors', () => {
        const errorMssg = 'sync error';
        class SyncThrowMiddleware extends BaseMiddleware {
            protected getHandler(): RequestHandler {
                return () => {
                    throw new Error(errorMssg);
                };
            }
        }

        const middleware = new SyncThrowMiddleware();
        const handler = middleware.middleware();

        const req = {} as Request;
        const res = {} as Response;
        const next = jest.fn();

        handler(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect((next.mock.calls[0][0] as Error).message).toBe(errorMssg);
    });

    it('returns a middleware that handles async errors', async () => {
        const errorMssg = 'async error';
        class AsyncThrowMiddleware extends BaseMiddleware {
            protected getHandler(): RequestHandler {
                return async () => {
                    throw new Error(errorMssg);
                };
            }
        }

        const middleware = new AsyncThrowMiddleware();
        const handler = middleware.middleware();

        const req = {} as Request;
        const res = {} as Response;
        const next = jest.fn();

        await handler(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect((next.mock.calls[0][0] as Error).message).toBe(errorMssg);
    });
});

