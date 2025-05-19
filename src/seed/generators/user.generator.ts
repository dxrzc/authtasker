import { faker } from '@faker-js/faker';
import { USER_CONSTANTS as CONSTS } from "@root/rules/constants/user.constants";

export class UserDataGenerator {

    constructor() {}

    private generateRandomName() {
        const randomSufix = faker.number.int({ max: 100 });

        // generated a number between 0 and 1
        const random = Math.round(Math.random());

        const randomName = (random === 0) ?
            faker.internet.username() :
            faker.person.firstName();

        return randomName
            .concat(randomSufix.toString());
    }

    name() {
        let name: string;

        do {
            name = this.generateRandomName();
        } while (
            name.length > CONSTS.MAX_NAME_LENGTH ||
            name.length < CONSTS.MIN_NAME_LENGTH
        )

        return name
            .toLowerCase()
            .trim();
    }

    email() {
        return faker
            .internet
            .email();
    }

    password() {
        return faker
            .internet
            .password({
                length: CONSTS.MAX_PASSWORD_LENGTH
            });
    }

    fullUser() {
        return {
            name: this.name(),
            email: this.email(),
            password: this.password()
        }
    }
}