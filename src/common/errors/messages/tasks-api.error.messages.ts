
export const tasksApiErrors = {
    // db    
    taskAlreadyExists: (prop: string) => `A task with this ${prop} already exists`,
    TASK_NOT_FOUND: 'Task not found',
    // validation
    NAME_NOT_PROVIDED: 'Task name not provided',
    DESCRIPTION_NOT_PROVIDED: 'Task description not provided',
    INVALID_NAME_LENGTH: 'Invalid name length',
    INVALID_DESCRIPTION_LENGTH: 'Invalid description length',
    INVALID_STATUS: 'Invalid task status',
    INVALID_PRIORITY: 'Invalid task priority',
    NO_PROPERTIES_TO_UPDATE: 'No properties to update',
};