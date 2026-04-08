import { UserSessionInfo } from 'src/interfaces/user/user-session-info.interface';

declare global {
    namespace Express {
        interface Request {
            user?: UserSessionInfo;
        }
    }
}
