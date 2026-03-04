import winston from 'winston';

export type LogInfoType = Readonly<winston.Logform.TransformableInfo> & {
    readonly [prop: string]: any;
};
