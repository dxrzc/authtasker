export const usersLimits = {
    MAX_NAME_LENGTH: 15,
    // Increased from 20 to 120 to support longer passphrases. SHA-256 pre-hashing allows this without impacting bcrypt compatibility.
    MAX_PASSWORD_LENGTH: 120,
    MIN_NAME_LENGTH: 5,
    MIN_PASSWORD_LENGTH: 8,
} as const;
