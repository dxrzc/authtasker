import { faker } from '@faker-js/faker';
import { userConstraints } from 'src/constraints/user.constraints';

export class UserDataGenerator {
    constructor() {}

    private generateRandomName() {
        const randomSufix = faker.number.int({ max: 100 });
        const suffixLength = randomSufix.toString().length;
        const maxBaseLength = userConstraints.MAX_NAME_LENGTH - suffixLength;
        // Choose randomly between username and first name
        const random = Math.round(Math.random());
        let baseName = random === 0 ? faker.internet.username() : faker.person.firstName();
        // Ensure base name does not exceed available space
        if (baseName.length > maxBaseLength) {
            baseName = baseName.substring(0, maxBaseLength);
        }
        const fullName = baseName.concat(randomSufix.toString());
        // Ensure minimum length is met
        if (fullName.length < userConstraints.MIN_NAME_LENGTH) {
            const paddingNeeded = userConstraints.MIN_NAME_LENGTH - fullName.length;
            return fullName + 'x'.repeat(paddingNeeded);
        }
        return fullName;
    }

    get name() {
        const name = this.generateRandomName();
        return name.toLowerCase().trim();
    }

    get email() {
        return faker.internet.email();
    }

    get password() {
        return faker.internet.password({
            length: userConstraints.MAX_PASSWORD_LENGTH,
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
