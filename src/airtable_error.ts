class AirtableError extends Error {
    error: string;
    statusCode: number;

    constructor(error: string, message: string, statusCode: number) {
        super(message);
        this.error = error;
        this.statusCode = statusCode;
    }

    toString() {
        const statusCodeFormatted = this.statusCode ? `[Http code ${this.statusCode}]` : '';
        return `${this.message}(${this.error})${statusCodeFormatted}`;
    }
}

export = AirtableError;
