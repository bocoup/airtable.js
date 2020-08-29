import {includes} from "./includes";

function check<Value, Error>(fn: (value: any) => value is Value, error: Error) {
    return function(value: Value): {pass: true} | {pass: false; error: Error} {
        if (fn(value)) {
            return {pass: true};
        } else {
            return {pass: false, error: error};
        }
    };
}

check.isOneOf = function isOneOf(options) {
    return includes.bind(this, options);
};

check.isArrayOf = function<Value>(itemValidator: (value: any) => value is Value) {
    return function(value: any): value is Value[] {
        return Array.isArray(value) && value.every(itemValidator);
    };
};

export = check;
