import { rmSync } from "fs";
import { fileExistsSync } from "tsconfig-paths/lib/filesystem";
import { SystemLoggerService } from "src/services/system-logger.service";

export const removeAdminSessionTokenIfExists = () => {
    const tokenPath = `${__dirname}/admin-session-token.txt`;
    if (fileExistsSync(tokenPath)) {
        rmSync(tokenPath);
        SystemLoggerService.info('Admin token removed');
    } else {
        SystemLoggerService.info('Admin token does not exist, nothing to remove');
    }
};