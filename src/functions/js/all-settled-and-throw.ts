export async function allSettledAndThrow(promises: Promise<unknown>[]) {
    const results = await Promise.allSettled(promises);
    const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason);
    if (errors.length === 1) {
        throw errors[0];
    }
    if (errors.length > 1) {
        throw new AggregateError(errors, 'Multiple promises were rejected');
    }
    return results;
}
