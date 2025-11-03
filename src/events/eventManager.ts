import { EventEmitter } from 'node:events';

export const eventEmitter = new EventEmitter();

export class EventManager {
    static emit(eventName: string, ...data: any[]) {
        eventEmitter.emit(eventName, ...data);
    }

    static listen(eventName: string, callback: (...args: any[]) => void) {
        eventEmitter.on(eventName, callback);
    }
}
