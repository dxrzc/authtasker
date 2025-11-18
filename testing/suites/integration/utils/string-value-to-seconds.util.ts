import ms, { StringValue } from 'ms';

export function stringValueToSeconds(value: string): number {
    return ms(<StringValue>value) / 1000;
}
