import Table from './table';
import Base from './base';

type BaseFunctorMethods = {
    [key in 'table' | 'makeRequest' | 'runAction' | 'getId']: Base[key];
};
export interface BaseFunctor extends BaseFunctorMethods {
    (tableName: string): Table;
    tables: any;
}
