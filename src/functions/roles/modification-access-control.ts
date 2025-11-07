import { UserRole } from 'src/enums/user-role.enum';
import { UserIdentity } from 'src/interfaces/user/user-indentity.interface';

// checks if requestUser can perform modifications on targetUser
export function modificationAccessControl(requestUser: UserIdentity, targetUser: UserIdentity) {
    // users can modify themselves
    if (requestUser.id === targetUser.id) return true;
    // admin users can modify other users (but not other admins)
    if (requestUser.role === UserRole.ADMIN && targetUser.role !== UserRole.ADMIN) return true;
    return false;
}
