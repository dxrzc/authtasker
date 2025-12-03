export function resetYourPasswordTemplate(link: string) {
    return `
            <h1> Password Recovery </h1>
            <p> Click below to recover your password </p>
            <a href= "${link}"> Recover your password </a>`;
}
