export const getTokenFromMail = (emailHtml: string): string => {
    const match = emailHtml.match(/confirmEmailValidation\/([^"]+)/);
    const token = match?.[1];
    return token!;
};
