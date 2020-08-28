import Table from './table';
import {AirtableRequestOptions} from './airtable_request_options';

interface RecordCallback {
    (error: null, record: Record): void;
    (error: any): void;
}

function callDoneOrReturnPromise<P extends Promise<Result>, Result>(
    promise: P,
    done: (error: any, result?: Result) => void
): P | void {
    if (done) {
        promise.then(value => done(null, value), done);
        return void 0;
    }
    return promise;
}

class Record {
    private readonly _table: Table;
    private _rawJson: any;

    readonly id: string;
    fields: any;

    constructor(table: Table, recordId: string, recordJson?: any) {
        this._table = table;
        this.id = recordId || recordJson.id;
        this.setRawJson(recordJson);

        this.save = this.save.bind(this);
        this.patchUpdate = this.patchUpdate.bind(this);
        this.putUpdate = this.putUpdate.bind(this);
        this.destroy = this.destroy.bind(this);
        this.fetch = this.fetch.bind(this);

        this.updateFields = this.patchUpdate;
        this.replaceFields = this.putUpdate;
    }

    getId() {
        return this.id;
    }

    get(columnName: string) {
        return this.fields[columnName];
    }

    set(columnName: string, columnValue: any) {
        this.fields[columnName] = columnValue;
    }

    setRawJson(rawJson: any) {
        this._rawJson = rawJson;
        this.fields = this._rawJson?.fields ?? {};
    }

    makeRequest(options: Omit<AirtableRequestOptions, 'path'>) {
        return this._table.makeRequest({
            ...options,
            path: `/${this.id}`,
        });
    }

    /**
     * @deprecated This function is deprecated.
     */
    runAction(method, queryParams, bodyData, callback) {
        this._table.runAction(method, `${this.id}`, queryParams, bodyData, callback);
    }

    /**
     * @deprecated This function is deprecated.
     */
    asyncRunAction(method, queryParams, bodyData): Promise<any> {
        return new Promise((resolve, reject) => {
            this.runAction(method, queryParams, bodyData, (err, response, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    }

    save(): Promise<Record>;
    save(done: RecordCallback): void;
    save(done?: RecordCallback): Promise<Record> | void {
        return callDoneOrReturnPromise(this._save(), done);
    }

    private async _save() {
        return this.putUpdate(this.fields);
    }

    patchUpdate(cellValuesByName): Promise<Record>;
    patchUpdate(cellValuesByName, done: RecordCallback): void;
    patchUpdate(cellValuesByName, opts): Promise<Record>;
    patchUpdate(cellValuesByName, opts, done: RecordCallback): void;
    patchUpdate(
        ...args: [any] | [any, RecordCallback] | [any, any] | [any, any, RecordCallback]
    ): Promise<Record> | void {
        const {cellValuesByName, opts, done} = this._destructUpdateArgs(args);
        return callDoneOrReturnPromise(this._update('patch', cellValuesByName, opts), done);
    }

    updateFields(cellValuesByName): Promise<Record>;
    updateFields(cellValuesByName, done: RecordCallback): void;
    updateFields(cellValuesByName, opts): Promise<Record>;
    updateFields(cellValuesByName, opts, done: RecordCallback): void;
    updateFields(
        ...args: [any] | [any, RecordCallback] | [any, any] | [any, any, RecordCallback]
    ): Promise<Record> | void {
        return this.patchUpdate(...(args as [any, any, any]));
    }

    putUpdate(cellValuesByName): Promise<Record>;
    putUpdate(cellValuesByName, done: RecordCallback): void;
    putUpdate(cellValuesByName, opts): Promise<Record>;
    putUpdate(cellValuesByName, opts, done: RecordCallback): void;
    putUpdate(
        ...args: [any] | [any, RecordCallback] | [any, any] | [any, any, RecordCallback]
    ): Promise<Record> | void {
        const {cellValuesByName, opts, done} = this._destructUpdateArgs(args);
        return callDoneOrReturnPromise(this._update('put', cellValuesByName, opts), done);
    }

    replaceFields(cellValuesByName): Promise<Record>;
    replaceFields(cellValuesByName, done: RecordCallback): void;
    replaceFields(cellValuesByName, opts): Promise<Record>;
    replaceFields(cellValuesByName, opts, done: RecordCallback): void;
    replaceFields(
        ...args: [any] | [any, RecordCallback] | [any, any] | [any, any, RecordCallback]
    ): Promise<Record> | void {
        return this.putUpdate(...(args as [any, any, any]));
    }

    private _destructUpdateArgs(
        args: [any] | [any, RecordCallback] | [any, any] | [any, any, RecordCallback]
    ): {cellValuesByName: any; opts: any; done?: RecordCallback} {
        if (args.length === 1) {
            const [cellValuesByName] = args;
            return {cellValuesByName, opts: {}};
        } else if (args.length === 2) {
            const [cellValuesByName, secondArg] = args;
            if (typeof secondArg === 'function') {
                const done = secondArg as RecordCallback;
                return {cellValuesByName, opts: {}, done};
            } else {
                const opts = secondArg;
                return {cellValuesByName, opts};
            }
        } else {
            const [cellValuesByName, opts, done] = args;
            return {cellValuesByName, opts, done};
        }
    }

    private async _update(
        method: 'patch' | 'put',
        cellValuesByName: any,
        opts: any
    ): Promise<Record> {
        const updateBody = {
            fields: cellValuesByName,
            ...opts,
        };

        const results = await this.asyncRunAction(method, {}, updateBody);

        this.setRawJson(results);
        return this;
    }

    destroy(): Promise<Record>;
    destroy(done: RecordCallback): void;
    destroy(done?: RecordCallback): Promise<Record> | void {
        return callDoneOrReturnPromise(this._destroy(), done);
    }

    private async _destroy() {
        await this.asyncRunAction('delete', {}, null);
        return this;
    }

    fetch(): Promise<Record>;
    fetch(done: RecordCallback): void;
    fetch(done?: RecordCallback): Promise<Record> | void {
        return callDoneOrReturnPromise(this._fetch(), done);
    }

    private async _fetch() {
        const results = await this.asyncRunAction('get', {}, null);
        this.setRawJson(results);
        return this;
    }
}

export = Record;
