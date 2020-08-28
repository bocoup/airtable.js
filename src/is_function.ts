export const isFunction = (maybeFunction: any): maybeFunction is (...args: any[]) => any => (
    typeof maybeFunction === 'function'
);
