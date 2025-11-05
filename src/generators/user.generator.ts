import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/constants/user.constants';

export class UserDataGenerator {
    constructor() {}

    private generateRandomName() {
        const randomSufix = faker.number.int({ max: 100 });
        const random = Math.round(Math.random()); // generated a number between 0 and 1
        const randomName = random === 0 ? faker.internet.username() : faker.person.firstName();
        return randomName.concat(randomSufix.toString());
    }

    get name() {
        let name: string;
        do {
            name = this.generateRandomName();
        } while (
            name.length > usersLimits.MAX_NAME_LENGTH ||
            name.length < usersLimits.MIN_NAME_LENGTH
        );
        return name.toLowerCase().trim();
    }

    get email() {
        return faker.internet.email();
    }

    get password() {
        return faker.internet.password({
            length: usersLimits.MAX_PASSWORD_LENGTH,
        });
    }

    get user() {
        return {
            password: this.password,
            email: this.email,
            name: this.name,
        };
    }
}
