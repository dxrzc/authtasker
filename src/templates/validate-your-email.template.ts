export function validateYourEmailTemplate(validationLink: string): string {
    return `
            <h1> Validate your email </h1>
            <p> Click below to validate your email </p>
            <a href= "${validationLink}"> Validate your email </a>`;
}
