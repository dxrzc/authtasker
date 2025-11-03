// Represents the user roles.
// validRoles is useful for validation.
export const validRoles = ['readonly', 'editor', 'admin'] as const;
export type UserRole = (typeof validRoles)[number];
