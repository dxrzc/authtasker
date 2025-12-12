export const usersLimits = {
    MAX_NAME_LENGTH: 15,
    // Increased from 20 to 120 due to the adoption of SHA-256 pre-hashing, which allows for longer passwords without impacting storage or security.
    // The value 120 was chosen to accommodate users who prefer long passphrases, while remaining well within practical and performance limits.
    // No significant performance implications are expected, as passwords are pre-hashed before storage or further processing.
    MAX_PASSWORD_LENGTH: 120,
    MIN_NAME_LENGTH: 5,
    MIN_PASSWORD_LENGTH: 8,
} as const;
