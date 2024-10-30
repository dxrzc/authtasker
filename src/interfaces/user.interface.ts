import { Roles } from "../types/roles.type";

export interface UserInterface {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    role: Roles;
}