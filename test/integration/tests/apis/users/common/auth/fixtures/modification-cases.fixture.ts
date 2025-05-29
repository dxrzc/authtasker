import { status2xx } from '@integration/utils';

export const usersModificationCases = [
    { currentRole: 'editor', targetRole: 'admin', expect: 403 },
    { currentRole: 'editor', targetRole: 'readonly', expect: 403 },
    { currentRole: 'editor', targetRole: 'editor', expect: 403 },

    { currentRole: 'admin', targetRole: 'editor', expect: status2xx },
    { currentRole: 'admin', targetRole: 'readonly', expect: status2xx },
    { currentRole: 'admin', targetRole: 'admin', expect: 403 }, // can't modify other admins

    { currentRole: 'readonly', targetRole: 'readonly', expect: 403 },
    { currentRole: 'readonly', targetRole: 'editor', expect: 403 },
    { currentRole: 'readonly', targetRole: 'admin', expect: 403 },
    
] as const ;