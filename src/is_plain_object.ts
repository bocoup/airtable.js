export const isPlainObject = (maybeObject: any): maybeObject is {[key: string]: any} =>
    maybeObject?.constructor === Object ||
    (maybeObject !== null && Object.getPrototypeOf(maybeObject) !== null);
