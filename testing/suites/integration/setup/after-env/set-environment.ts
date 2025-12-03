import { faker } from '@faker-js/faker/.';
import { config } from 'dotenv';

config({ path: `${process.cwd()}/.env.defaults` });
config({ path: `${process.cwd()}/.env.test`, override: true });

process.env.NODE_ENV = 'integration';

// nodemailer-mock
process.env.MAIL_SERVICE_HOST = faker.internet.domainName();
process.env.MAIL_SERVICE_PORT = '1024';
process.env.MAIL_SERVICE_USER = 'any';
process.env.MAIL_SERVICE_PASS = 'any';
