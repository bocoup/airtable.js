import clone from 'lodash.clone';
import Record from './record';
import callbackToPromise from './callback_to_promise';
import Table from './table';
import {paramValidators, QueryParams} from './query_params';

type PageCallback = (records: Record[], processNextPage: () => void) => void;
type RecordCollectionCallback = (error: any, records?: Record[]) => void;
type DoneCallback = (error: any, value?: null) => void;

interface RecordCollectionRequestMethod {
    (): Promise<Record[]>;
    (done: RecordCollectionCallback): void;
}

interface RecordPageIteratationMethod {
    (pageCallback: PageCallback): Promise<void>;
    (pageCallback: PageCallback, done: DoneCallback): void;
}

/**
 * Builds a query object. Won't fetch until `firstPage` or
 * or `eachPage` is called.
 *
 * Params should be validated prior to being passed to Query
 * with `Query.validateParams`.
 */
class Query {
    private readonly _table: Table;
    private readonly _params: QueryParams;

    readonly firstPage: RecordCollectionRequestMethod;
    readonly eachPage: RecordPageIteratationMethod;
    readonly all: RecordCollectionRequestMethod;

    static paramValidators = paramValidators;

    constructor(table: Table, params: QueryParams) {
        this._table = table;
        this._params = params;

        this.firstPage = callbackToPromise(this._firstPage, this);
        this.eachPage = callbackToPromise(this._eachPage, this, 1);
        this.all = callbackToPromise(this._all, this);
    }

    /**
     * Fetches the first page of results for the query asynchronously,
     * then calls `done(error, records)`.
     */
    private _firstPage(done: RecordCollectionCallback) {
        if (typeof done !== 'function') {
            throw new Error('The first parameter to `firstPage` must be a function');
        }

        this.eachPage(
            records => {
                done(null, records);
            },
            error => {
                done(error, null);
            }
        );
    }

    /**
     * Fetches each page of results for the query asynchronously.
     *
     * Calls `pageCallback(records, fetchNextPage)` for each
     * page. You must call `fetchNextPage()` to fetch the next page of
     * results.
     *
     * After fetching all pages, or if there's an error, calls
     * `done(error)`.
     */
    private _eachPage(pageCallback: PageCallback, done: DoneCallback) {
        if (typeof pageCallback !== 'function') {
            throw new Error('The first parameter to `eachPage` must be a function');
        }

        if (typeof done !== 'function' && done !== void 0) {
            throw new Error('The second parameter to `eachPage` must be a function or undefined');
        }

        const params = clone(this._params);

        const inner = () => {
            this._table.runAction('get', '', params, null, (err, response, result) => {
                if (err) {
                    done(err, null);
                } else {
                    let next;
                    if (result.offset) {
                        params.offset = result.offset;
                        next = inner;
                    } else {
                        next = () => {
                            done(null);
                        };
                    }

                    const records = result.records.map(recordJson => {
                        return new Record(this._table, null, recordJson);
                    });

                    pageCallback(records, next);
                }
            });
        };

        inner();
    }

    /**
     * Fetches all pages of results asynchronously. May take a long time.
     */
    private _all(done: RecordCollectionCallback) {
        if (typeof done !== 'function') {
            throw new Error('The first parameter to `all` must be a function');
        }

        const allRecords = [];
        this.eachPage(
            (pageRecords, fetchNextPage) => {
                allRecords.push(...pageRecords);
                fetchNextPage();
            },
            err => {
                if (err) {
                    done(err, null);
                } else {
                    done(null, allRecords);
                }
            }
        );
    }

    /**
     * Validates the parameters for passing to the Query constructor.
     *
     * @params {object} params parameters to validate
     *
     * @return an object with two keys:
     *  validParams: the object that should be passed to the constructor.
     *  ignoredKeys: a list of keys that will be ignored.
     *  errors: a list of error messages.
     */
    static validateParams(params: any) {
        const validParams: QueryParams = {};
        const ignoredKeys = [];
        const errors = [];

        for (const key of Object.keys(params)) {
            const value = params[key];
            if (key in Query.paramValidators) {
                const validator = Query.paramValidators[key];
                const validationResult = validator(value);
                if (validationResult.pass) {
                    validParams[key] = value;
                } else {
                    errors.push(validationResult.error);
                }
            } else {
                ignoredKeys.push(key);
            }
        }

        return {
            validParams,
            ignoredKeys,
            errors,
        };
    }
}

export = Query;
