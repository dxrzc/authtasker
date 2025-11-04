import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/constants/user.constants';

export class UserDataGenerator {
    constructor() {}

    private generateRandomName() {
        const randomSufix = faker.number.int({ max: 100 });

        // generated a number between 0 and 1
        const random = Math.round(Math.random());

        const randomName = random === 0 ? faker.internet.username() : faker.person.firstName();

        return randomName.concat(randomSufix.toString());
    }

    name() {
        let name: string;

        do {
            name = this.generateRandomName();
        } while (
            name.length > usersLimits.MAX_NAME_LENGTH ||
            name.length < usersLimits.MIN_NAME_LENGTH
        );

        return name.toLowerCase().trim();
    }

    email() {
        return faker.internet.email();
    }

    password() {
        return faker.internet.password({
            length: usersLimits.MAX_PASSWORD_LENGTH,
        });
    }

    fullUser() {
        return {
            name: this.name(),
            email: this.email(),
            password: this.password(),
        };
    }
}
