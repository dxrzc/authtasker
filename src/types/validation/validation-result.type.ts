
// Validation function return type
export type ValidationResult<T> = Promise<[string, null] | [null, T]>