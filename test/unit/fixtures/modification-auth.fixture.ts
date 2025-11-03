export const modificationAuthFixture = [
    { currentUserRole: 'admin', targetUserRole: 'admin', expected: 'forbidden' },
    { currentUserRole: 'admin', targetUserRole: 'editor', expected: 'authorized' },
    { currentUserRole: 'admin', targetUserRole: 'readonly', expected: 'authorized' },

    { currentUserRole: 'editor', targetUserRole: 'admin', expected: 'forbidden' },
    { currentUserRole: 'editor', targetUserRole: 'editor', expected: 'forbidden' },
    { currentUserRole: 'editor', targetUserRole: 'readonly', expected: 'forbidden' },

    { currentUserRole: 'readonly', targetUserRole: 'admin', expected: 'forbidden' },
    { currentUserRole: 'readonly', targetUserRole: 'editor', expected: 'forbidden' },
    { currentUserRole: 'readonly', targetUserRole: 'readonly', expected: 'forbidden' },
] as const;
