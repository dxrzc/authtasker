export async function allSettledAndThrow(promises: Promise<unknown>[]) {
    const results = await Promise.allSettled(promises);
    const rejection = results.find((r) => r.status === 'rejected');
    if (rejection) throw rejection.reason;
    return results;
}
