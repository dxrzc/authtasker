
// Makes any property in T no-readonly
export type NoReadonly<T> = {
    -readonly [prop in keyof T]: T[prop]
}