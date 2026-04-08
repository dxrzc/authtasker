import { RequestLocation } from 'src/enums/request-location.enum';

export interface IIdValidationMiddlewareOptions {
    requestLocation: RequestLocation;
    errorMessage: string;
    propertyName: string;
    optional?: boolean;
}
