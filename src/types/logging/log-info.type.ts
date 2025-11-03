import winston from 'winston';

export type LogInfoType = winston.Logform.TransformableInfo & {
    [prop: string]: any;
};
