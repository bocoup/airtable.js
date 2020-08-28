import Base from './base';
import Record from './record';
import Table from './table';
import AirtableError from './airtable_error';
import packageVersion from './package_version';
import objectToQueryParamString from './object_to_query_param_string';
import HttpHeaders from './http_headers';
import exponentialBackoffWithJitter from './exponential_backoff_with_jitter';
import {AirtableRequestOptions} from './airtable_request_options';
import {isPlainObject} from './is_plain_object';

type RunActionResponse = Pick<Response, keyof Response> & {
    statusCode: Response['status'];
};

type RunActionCallback = (
    error: AirtableError | null,
    response?: RunActionResponse,
    body?: any
) => void;

const USER_AGENT = `Airtable.js/${packageVersion}`;

class Airtable {
    private readonly _apiKey: string;
    private readonly _endpointUrl: string;
    private readonly _apiVersion: string;
    private readonly _apiVersionMajor: string;
    private readonly _noRetryIfRateLimited: boolean;

    requestTimeout: number;

    static Base = Base;
    static Record = Record;
    static Table = Table;
    static Error = AirtableError;

    static apiKey: string;
    static apiVersion: string;
    static endpointUrl: string;
    static noRetryIfRateLimited: boolean;

    constructor(
        opts: {
            apiKey?: string;
            apiVersion?: string;
            endpointUrl?: string;
            requestTimeout?: number;
            noRetryIfRateLimited?: boolean;
        } = {}
    ) {
        const defaultConfig = Airtable.default_config();

        const apiVersion = opts.apiVersion || Airtable.apiVersion || defaultConfig.apiVersion;

        Object.defineProperties(this, {
            _apiKey: {
                value: opts.apiKey || Airtable.apiKey || defaultConfig.apiKey,
            },
            _endpointUrl: {
                value: opts.endpointUrl || Airtable.endpointUrl || defaultConfig.endpointUrl,
            },
            _apiVersion: {
                value: apiVersion,
            },
            _apiVersionMajor: {
                value: apiVersion.split('.')[0],
            },
            _noRetryIfRateLimited: {
                value:
                    opts.noRetryIfRateLimited ||
                    Airtable.noRetryIfRateLimited ||
                    defaultConfig.noRetryIfRateLimited,
            },
        });

        this.requestTimeout = opts.requestTimeout || defaultConfig.requestTimeout;

        if (!this._apiKey) {
            throw new Error('An API key is required to connect to Airtable');
        }
    }

    base(baseId: string) {
        return Base.createFunctor(this, baseId);
    }

    async makeRequest(
        options: AirtableRequestOptions = {}
    ): Promise<{
        statusCode: number;
        headers: Response['headers'];
        body: any;
    }> {
        const method = (options.method ?? 'GET').toUpperCase();
        const path = options.path ?? '/';
        const qs = objectToQueryParamString(options.qs ?? {});
        const headers = _getRequestHeaders(this._apiKey, options.headers ?? {});

        let requestBody: string;
        if ('body' in options && _canRequestMethodIncludeBody(method)) {
            requestBody = JSON.stringify(options.body);
        }

        const {_endpointUrl, _apiVersionMajor} = this;
        const url = `${_endpointUrl}/v${_apiVersionMajor}${path}?${qs}`;

        const controller = new AbortController();

        const requestOptions: RequestInit = {
            method,
            headers,
            signal: controller.signal,
            body: requestBody,
        };

        const timeout = setTimeout(() => controller.abort(), this.requestTimeout);

        let resp: Response;
        try {
            resp = await fetch(url, requestOptions);
        } catch (err) {
            throw new AirtableError('CONNECTION_ERROR', err.message, null);
        } finally {
            clearTimeout(timeout);
        }

        if (resp.status === 429 && !this._noRetryIfRateLimited) {
            const numAttempts = options?._numAttempts ?? 0;
            const backoffDelayMs = exponentialBackoffWithJitter(numAttempts);

            await new Promise(resolve => setTimeout(resolve, backoffDelayMs));

            const newOptions = {
                ...options,
                _numAttempts: numAttempts + 1,
            };
            return this.makeRequest(newOptions);
        }

        let responseBody: any;
        try {
            responseBody = await resp.json();
        } catch (jsonResponseErr) {
            throw _getErrorForNonObjectBody(resp.status);
        }

        if (resp.status >= 400) {
            throw _checkStatusForError(resp.status, responseBody);
        } else if (!isPlainObject(responseBody)) {
            throw _getErrorForNonObjectBody(resp.status);
        }

        return {
            statusCode: resp.status,
            headers: resp.headers,
            body: responseBody,
        };
    }

    /**
     * @deprecated This function is deprecated.
     */
    runAction(
        method: string,
        path: string,
        headers,
        queryParams,
        bodyData,
        callback: RunActionCallback
    ) {
        this._runAction(method, path, headers, queryParams, bodyData, callback, 0);
    }

    /**
     * @deprecated This function is deprecated.
     */
    private async _runAction(
        method: string,
        path: string,
        headers,
        queryParams,
        bodyData,
        callback: RunActionCallback,
        numAttempts: number
    ) {
        const qs = objectToQueryParamString(queryParams);

        const {_endpointUrl, _apiVersionMajor} = this;
        const url = `${_endpointUrl}/v${_apiVersionMajor}${path}?${qs}`;

        const isBrowser = typeof window !== 'undefined';
        let userAgentHeaderKey: string;
        // Some browsers do not allow overriding the user agent.
        // https://github.com/Airtable/airtable.js/issues/52
        if (isBrowser) {
            userAgentHeaderKey = 'x-airtable-user-agent';
        } else {
            userAgentHeaderKey = 'User-Agent';
        }

        const fullHeaders = {
            ...headers,
            authorization: `Bearer ${this._apiKey}`,
            'x-api-version': this._apiVersion,
            'content-type': 'application/json',
            [userAgentHeaderKey]: USER_AGENT,
        };

        const controller = new AbortController();
        const normalizedMethod = method.toUpperCase();

        let requestBody: string;
        if (bodyData !== null) {
            if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') {
                console.warn('body argument to runAction are ignored with GET or HEAD requests');
            } else {
                requestBody = JSON.stringify(bodyData);
            }
        }

        const options: RequestInit = {
            method: normalizedMethod,
            headers: fullHeaders,
            signal: controller.signal,
            body: requestBody,
        };

        const timeout = setTimeout(() => {
            controller.abort();
        }, this.requestTimeout);

        let resp: Response;
        try {
            resp = await fetch(url, options);
        } catch (err) {
            callback(err);
            return;
        } finally {
            clearTimeout(timeout);
        }

        if (resp.status === 429 && !this._noRetryIfRateLimited) {
            const backoffDelayMs = exponentialBackoffWithJitter(numAttempts);
            await new Promise(resolve => setTimeout(resolve, backoffDelayMs));
            await this._runAction(
                method,
                path,
                headers,
                queryParams,
                bodyData,
                callback,
                numAttempts + 1
            );
            return;
        }

        let responseBody: any;
        try {
            responseBody = await resp.json();
        } catch (jsonResponseErr) {
            callback(_checkStatusForError(resp.status));
            return;
        }

        const error = _checkStatusForError(resp.status, responseBody);
        // Ensure Response interface matches interface from
        // `request` Response object
        const r = {} as any;
        for (const property of Object.keys(resp)) {
            r[property] = resp[property];
        }
        r.body = responseBody;
        r.statusCode = resp.status;
        callback(error, r, responseBody);
    }

    static default_config() {
        return {
            endpointUrl: process.env.AIRTABLE_ENDPOINT_URL || 'https://api.airtable.com',
            apiVersion: '0.1.0',
            apiKey: process.env.AIRTABLE_API_KEY,
            noRetryIfRateLimited: false,
            requestTimeout: 300 * 1000, // 5 minutes
        };
    }

    static configure({apiKey, endpointUrl, apiVersion, noRetryIfRateLimited}) {
        Airtable.apiKey = apiKey;
        Airtable.endpointUrl = endpointUrl;
        Airtable.apiVersion = apiVersion;
        Airtable.noRetryIfRateLimited = noRetryIfRateLimited;
    }

    static base(baseId: string) {
        return new Airtable().base(baseId);
    }
}

function _getRequestHeaders(apiKey, headers) {
    const result = new HttpHeaders();

    result.set('Authorization', `Bearer ${apiKey}`);
    result.set('User-Agent', USER_AGENT);
    result.set('Content-Type', 'application/json');
    for (const headerKey of Object.keys(headers)) {
        result.set(headerKey, headers[headerKey]);
    }

    return result.toJSON();
}

function _checkStatusForError(statusCode: number, body?: any) {
    if (statusCode === 401) {
        return new AirtableError(
            'AUTHENTICATION_REQUIRED',
            'You should provide valid api key to perform this operation',
            statusCode
        );
    } else if (statusCode === 403) {
        return new AirtableError(
            'NOT_AUTHORIZED',
            'You are not authorized to perform this operation',
            statusCode
        );
    } else if (statusCode === 404) {
        const message = body?.error?.message ?? 'Could not find what you are looking for';
        return new AirtableError('NOT_FOUND', message, statusCode);
    } else if (statusCode === 413) {
        return new AirtableError('REQUEST_TOO_LARGE', 'Request body is too large', statusCode);
    } else if (statusCode === 422) {
        const type = body?.error?.type ?? 'UNPROCESSABLE_ENTITY';
        const message = body?.error?.message ?? 'The operation cannot be processed';
        return new AirtableError(type, message, statusCode);
    } else if (statusCode === 429) {
        return new AirtableError(
            'TOO_MANY_REQUESTS',
            'You have made too many requests in a short period of time. Please retry your request later',
            statusCode
        );
    } else if (statusCode === 500) {
        return new AirtableError(
            'SERVER_ERROR',
            'Try again. If the problem persists, contact support.',
            statusCode
        );
    } else if (statusCode === 503) {
        return new AirtableError(
            'SERVICE_UNAVAILABLE',
            'The service is temporarily unavailable. Please retry shortly.',
            statusCode
        );
    } else if (statusCode >= 400) {
        const type = body?.error?.type ?? 'UNEXPECTED_ERROR';
        const message = body?.error?.message ?? 'An unexpected error occurred';
        return new AirtableError(type, message, statusCode);
    } else {
        return null;
    }
}

function _canRequestMethodIncludeBody(method: string) {
    return method !== 'GET' && method !== 'DELETE';
}

function _getErrorForNonObjectBody(statusCode: number, body?: any) {
    if (isPlainObject(body)) {
        return null;
    } else {
        return new AirtableError(
            'UNEXPECTED_ERROR',
            'The response from Airtable was invalid JSON. Please try again soon.',
            statusCode
        );
    }
}

export = Airtable;
