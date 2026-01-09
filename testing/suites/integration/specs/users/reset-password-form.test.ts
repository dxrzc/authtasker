import { testKit } from '@integration/kit/test.kit';

describe(`GET ${testKit.urls.resetPassword}`, () => {
    test('escapes token to prevent reflected XSS', async () => {
        const maliciousToken = '</script><script>alert("pwn")</script>';
        // encodeURIComponent to make a valid URL
        const response = await testKit.agent.get(
            `${testKit.urls.resetPassword}?token=${encodeURIComponent(maliciousToken)}`,
        );
        expect(response.status).toBe(200);
        // Escaped malicious HTML should be in the response
        expect(response.text).toContain(
            '&lt;/script&gt;&lt;script&gt;alert(&quot;pwn&quot;)&lt;/script&gt;',
        );
        expect(response.text).not.toContain('<script>alert("pwn")</script>');
    });
});
