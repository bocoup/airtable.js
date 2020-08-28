import Base from './base';
import AirtableError from './airtable_error';

type RunActionCallback = (error: AirtableError | null, response?: Response, body?: any) => void;

/**
 * @deprecated This function is deprecated.
 */
function runAction(
    base: Base,
    method: string,
    path: string,
    queryParams,
    bodyData,
    callback: RunActionCallback,
    numAttempts: number
) {
    base.runAction(method, path, queryParams, bodyData, callback);
}

export = runAction;
