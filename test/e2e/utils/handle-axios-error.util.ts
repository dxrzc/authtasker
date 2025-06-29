import { AxiosError } from 'axios';

export function handleAxiosError(error: AxiosError) {
    const status = error.response?.status;
    const message = (error.response?.data as any).error;    
    throw new Error(
        `Failed request
        status: ${status},
        message: ${message}`
    );
}