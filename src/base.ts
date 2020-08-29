import Table from './table';
import Airtable from './airtable';
import {BaseFunctor} from './base_functor';

type BaseRequestOptions = {
    method?: string;
    path?: string;
    qs?: any;
    headers?: any;
    body?: any;
    _numAttempts?: number;
};

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

    async makeRequest(options: BaseRequestOptions = {}) {
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

    static createFunctor(airtable: Airtable, baseId: string): BaseFunctor {
        const base = new Base(airtable, baseId);
        const baseFn = tableName => {
            return base.doCall(tableName);
        };
        baseFn._base = base;
        baseFn.tables = base['tables'];
        baseFn.table = base.table.bind(base);
        baseFn.makeRequest = base.makeRequest.bind(base);
        baseFn.runAction = base.runAction.bind(base);
        baseFn.getId = base.getId.bind(base);
        return baseFn;
    }
}

export = Base;
