import { BaseHttpComponent } from '@root/common/classes/base';
import { Request, Response, NextFunction, RequestHandler } from 'express';

describe('BaseHttpComponent', () => {
    let base: BaseHttpComponent;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
        base = new BaseHttpComponent();
        req = {};
        res = {};
        next = jest.fn();
    });

    test('should call next with error if sync handler throws', () => {
        const error = new Error('sync error');
        const handler: RequestHandler = () => { throw error; };
        // @ts-ignore: access protected for test
        const wrapped = base.forwardError(handler);
        wrapped(req as Request, res as Response, next as NextFunction);
        expect(next).toHaveBeenCalledWith(error);
    });

    test('should call next with error if async handler rejects', async () => {
        const error = new Error('async error');
        const handler: RequestHandler = () => Promise.reject(error);
        // @ts-ignore: access protected for test
        const wrapped = base.forwardError(handler);
        await wrapped(req as Request, res as Response, next as NextFunction);
        // Wait for the promise chain to complete
        await new Promise(process.nextTick);
        expect(next).toHaveBeenCalledWith(error);
    });

    test('should not call next if handler succeeds (sync)', () => {
        const handler: RequestHandler = jest.fn();
        // @ts-ignore: access protected for test
        const wrapped = base.forwardError(handler);
        wrapped(req as Request, res as Response, next as NextFunction);
        expect(next).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
    });

    test('should not call next if handler succeeds (async)', async () => {
        const handler: RequestHandler = jest.fn(() => Promise.resolve());
        // @ts-ignore: access protected for test
        const wrapped = base.forwardError(handler);
        await wrapped(req as Request, res as Response, next as NextFunction);
        await new Promise(process.nextTick);
        expect(next).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
    });
});