import { LoggerService } from "@root/services"
import { NextFunction, Request, Response } from "express"

export const errorHandlerMiddlewareFactory = (loggerService: LoggerService) => {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        console.log('Running custom error handler');
    }
}