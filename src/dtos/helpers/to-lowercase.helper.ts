export const toLowerCaseAndTrim = ({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
        return value.toLowerCase().trim();
    }
    return value;
};
