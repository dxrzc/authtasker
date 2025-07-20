import { validRoles } from '@root/types/user/user-roles.type';

export const getRandomRole = ()=> {;
    const randomIndex = Math.floor(Math.random() * validRoles.length);
    return validRoles[randomIndex];    
};