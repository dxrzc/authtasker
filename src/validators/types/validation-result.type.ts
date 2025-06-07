
// Validation function return type
export type ValidationResult<T> = Promise<[string, undefined] | [undefined, T]>