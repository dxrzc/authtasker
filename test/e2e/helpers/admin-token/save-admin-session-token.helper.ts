import { writeFileSync } from 'fs';
import { SystemLoggerService } from 'src/services/system-logger.service';

export const saveAdminSessionToken = (token: string) => {
    const path = `${__dirname}/admin-session-token.txt`;
    writeFileSync(path, token);
    SystemLoggerService.info('Admin token obtained and saved temporary during testing');
};
