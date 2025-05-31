import nodemailer from "nodemailer";
import { ITransporter } from "@root/interfaces";
import { EmailService } from "@root/services";

describe('H', () => {
    test('ola', async () => {
        console.log('xd');
    });
});

/* 
describe('Email Service', () => {
    describe('constructor', () => {
        test('createTransport is called with the provided options', async () => {
            const transporterOptions: ITransporter = {
                host: 'localhost',
                port: 5379,
                user: 'test-user',
                pass: 'test-password'
            };
            const createTransportMock = jest.spyOn(nodemailer, 'createTransport')
                .mockImplementation();

            new EmailService(transporterOptions);

            expect(createTransportMock).toHaveBeenCalledWith({
                host: transporterOptions.host,
                port: transporterOptions.port,
                secure: transporterOptions.port === 465,
                auth: {
                    user: transporterOptions.user,
                    pass: transporterOptions.pass,
                },
            });
        });
    });

    describe('sendMail', () => {
        test('transporter.sendMail is called with the provided options', async () => {
            const emailService = new EmailService({
                host: 'localhost',
                port: 5379,
                user: 'test-user',
                pass: 'test-password'
            });

            const mailOptions: nodemailer.SendMailOptions = {
                to: 'test-email@gmail.com',
                subject: 'Hello World',
                html: `<h1>Hello-World</h1>`
            };

            const sendMailMock = jest.spyOn(emailService['transporter'], 'sendMail')
                .mockImplementation();

            emailService.sendMail(mailOptions);

            expect(sendMailMock).toHaveBeenCalledWith(mailOptions);
        });
    });
}); */