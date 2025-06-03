import { validRoles } from "@root/types/user";

export const getRandomRole = ()=> {;
    const randomIndex = Math.floor(Math.random() * validRoles.length);
    return validRoles[randomIndex];    
};