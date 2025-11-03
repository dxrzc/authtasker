import Mail from 'nodemailer/lib/mailer';

export function extractTokenFromResetPasswordLink(emailSent: Mail.Options): string {
    const emailHtml = emailSent.html as string;
    // extract everything after `token=`
    const tokenMatch = emailHtml.match(/token=([^"]+)/);
    let token: string;
    if (!tokenMatch) throw new Error('Token not found in email HTML');
    token = tokenMatch[1];
    return token;
}
