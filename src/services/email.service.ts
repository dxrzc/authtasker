import { SendMailOptions, Transporter, createTransport } from 'nodemailer';
import { ITransporter } from 'src/interfaces/email/transporter.interface';

export class EmailService {
    private transporter: Transporter;

    constructor(transporterOptions: ITransporter) {
        this.transporter = createTransport({
            host: transporterOptions.host,
            port: transporterOptions.port,
            secure: transporterOptions.port === 465,
            auth: {
                user: transporterOptions.user,
                pass: transporterOptions.pass,
            },
        });
    }

    async sendMail(options: SendMailOptions): Promise<void> {
        await this.transporter.sendMail(options);
    }
}
