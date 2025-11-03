import * as cheerio from 'cheerio';
import * as quotedPrintable from 'quoted-printable';
import { ImapFlow, MailboxLockObject } from 'imapflow';

// get email confirmation link from ethereal inbox using imapflow
export async function getEmailConfirmationFromLink(client: ImapFlow, userEmail: string) {
    let lock: MailboxLockObject | undefined;
    try {
        lock = await client.getMailboxLock('INBOX');
        const messages = await client.search({ to: userEmail });
        const message = await client.fetchOne(`${messages.at(-1)}`, { bodyParts: ['1'] });

        if (!message || !message.bodyParts) throw new Error('can not get message');

        const rawEmailMessage = message.bodyParts.values().next().value?.toString()!;

        const decodedMessage = quotedPrintable.decode(rawEmailMessage);
        const $ = cheerio.load(decodedMessage);
        const url = $('a').attr('href');
        return url!;
    } finally {
        if (lock) {
            lock.release();
        }
    }
}
