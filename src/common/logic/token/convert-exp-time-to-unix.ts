import ms, { StringValue } from 'ms';

// Using the exported type.
export function convertExpTimeToUniux(value: StringValue): number {
    const milliseconds = ms(value);
    return Math.floor(milliseconds / 1000);
}