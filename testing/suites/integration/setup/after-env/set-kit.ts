import { testKit } from '@integration/kit/test.kit';
import { TasksDataGenerator } from 'src/generators/tasks.generator';
import { UserDataGenerator } from 'src/generators/user.generator';
import { ModelLoader } from 'src/models/model.loader';
import { ConfigService } from 'src/services/config.service';
import { HashingService } from 'src/services/hashing.service';
import { JwtBlackListService } from 'src/services/jwt-blacklist.service';
import { JwtService } from 'src/services/jwt.service';
import { PasswordRecoveryTokenService } from 'src/services/password-recovery-token.service';
import { RefreshTokenService } from 'src/services/refresh-token.service';

beforeAll(() => {
    const configSvc = new ConfigService();
    testKit.tasksDataGenerator = new TasksDataGenerator();
    testKit.userDataGenerator = new UserDataGenerator();
    testKit.models = new ModelLoader({ emitEvents: false });
    testKit.configService = configSvc;
    testKit.sessionJwt = new JwtService(configSvc.JWT_SESSION_PRIVATE_KEY);
    testKit.refreshJwt = new JwtService(configSvc.JWT_REFRESH_PRIVATE_KEY);
    testKit.passwordRecovJwt = new JwtService(configSvc.JWT_PASSWORD_RECOVERY_PRIVATE_KEY);
    testKit.emailValidationJwt = new JwtService(configSvc.JWT_EMAIL_VALIDATION_PRIVATE_KEY);
    testKit.jwtBlacklistService = new JwtBlackListService(testKit.redisService);
    testKit.hashingService = new HashingService(configSvc.BCRYPT_SALT_ROUNDS);
    testKit.refreshTokenService = new RefreshTokenService(
        configSvc,
        testKit.refreshJwt,
        testKit.loggerServiceMock,
        testKit.redisService,
        testKit.models.user,
    );
    testKit.passwordRecoveryTokenService = new PasswordRecoveryTokenService(
        configSvc,
        testKit.passwordRecovJwt,
        testKit.jwtBlacklistService,
        testKit.loggerServiceMock,
    );
});
