import { validRoles } from 'src/types/user/user-roles.type';

export const getRandomRole = ()=> {;
    const randomIndex = Math.floor(Math.random() * validRoles.length);
    return validRoles[randomIndex];    
};