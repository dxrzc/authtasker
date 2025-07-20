import ms, { StringValue } from 'ms';

export function convertExpTimeToSeconds(value: StringValue): number {
    const milliseconds = ms(value);
    return Math.floor(milliseconds / 1000);
}