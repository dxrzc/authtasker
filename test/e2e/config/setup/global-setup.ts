import axios from 'axios';
import { ConfigService } from '@root/services/config.service'
import { SystemLoggerService } from '@root/services/system-logger.service';
import { teardownKit } from '@e2e/helpers/global-setup/teardownKit.helper';
import { saveAdminSessionToken } from '@e2e/helpers/admin-token/save-admin-session-token.helper';
import { removeAdminSessionTokenIfExists } from '@e2e/helpers/admin-token/remove-admin-session-token.helper';

export default async () => {
    const configService = new ConfigService();
    try {
        SystemLoggerService.info('Getting admin token...');
        const response = await axios.post(`${configService.WEB_URL}api/users/login`, {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
        });
        const adminSessionToken = response.data.sessionToken;
        saveAdminSessionToken(adminSessionToken);

        // Teardown
        teardownKit.configService = configService;

    } catch (error) {
        removeAdminSessionTokenIfExists();
        console.error(error);
        process.exit(1);
    }
}