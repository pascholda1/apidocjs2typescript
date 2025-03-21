export class RequestServiceError extends Error {
    readonly status: number;
    readonly rawResponse?: string;

    /**
     *
     * @param status — the http status code. \
     * __custom codes:__
     *  - 901: network error
     *  - 901: could not parse response
     *
     * @param message
     * @param rawResponse
     */
    constructor(status: number, message: string, rawResponse?: string) {
        super(message);
        this.status = status;
        this.rawResponse = rawResponse;
    }

    get detail(): object | string | undefined {
        if (this.rawResponse === undefined) {
            return undefined;
        }

        try {
            return JSON.parse(this.rawResponse);
        } catch (e) {
            console.debug(e);
            return this.rawResponse;
        }
    }
}
