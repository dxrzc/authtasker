export async function expectRequestToFail(reqData: {
    expectedStatus: number;
    request: Promise<any>;
}) {
    let errorThrown = false;
    try {
        await reqData.request;
    } catch (error) {
        const errorObj = JSON.parse((error as any).message);
        const reqStatus = errorObj.status;
        if (reqStatus !== reqData.expectedStatus)
            throw new Error(
                `Request failed with status ${reqStatus}, but status ${reqData.expectedStatus} was expected`,
            );
        errorThrown = true;
    }

    if (!errorThrown) {
        throw new Error(`Request was expected to fail but it successed`);
    }
}
