import forEach from 'lodash/forEach';
import Table from './table';
import Airtable from './airtable';
import {AirtableRequestOptions} from './airtable_request_options';

class Base {
    private readonly _airtable: Airtable;
    private readonly _id: string;

    constructor(airtable: Airtable, baseId: string) {
        this._airtable = airtable;
        this._id = baseId;
    }

    table(tableName: string) {
        return new Table(this, null, tableName);
    }

    async makeRequest(options: AirtableRequestOptions = {}) {
        const path = options.path ?? '/';
        return this._airtable.makeRequest({...options, path: `/${this._id}${path}`});
    }

    /**
     * @deprecated This method is deprecated.
     */
    runAction(method, path, queryParams, bodyData, callback) {
        this._airtable.runAction(
            method,
            `/${this._id}${path}`,
            {
                'x-airtable-application-id': this._id,
            },
            queryParams,
            bodyData,
            callback
        );
    }

    doCall(tableName) {
        return this.table(tableName);
    }

    getId() {
        return this._id;
    }

    static createFunctor(airtable: Airtable, baseId: string) {
        const base = new Base(airtable, baseId);
        const baseFn = tableName => {
            return base.doCall(tableName);
        };
        forEach(['table', 'makeRequest', 'runAction', 'getId'], baseMethod => {
            baseFn[baseMethod] = base[baseMethod].bind(base);
        });
        baseFn._base = base;
        baseFn.tables = base['tables'];
        return baseFn;
    }
}

export = Base;
