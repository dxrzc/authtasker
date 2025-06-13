import { EventManager } from './eventManager';

export class ApplicationEvents {

    // callback to close the application when a fundamental service connection error occurs
    static async closeApplication(closeApplicationCallBack: ()=> Promise<void>): Promise<void> {
        EventManager.listen('fatalServiceConnectionError', async () => {        
            await closeApplicationCallBack();  
        });
    }

    // callback to resume the application when a service reconnects successfully
    static async resumeApplication(resumeApplicationCallback: ()=> Promise<void>): Promise<void> {
        EventManager.listen('serviceConnectionResumed', async () => {        
            await resumeApplicationCallback();  
        });
    }
}