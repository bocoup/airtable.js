const didWarnForDeprecation = {};

/**
 * Convenience function for marking a function as deprecated.
 *
 * Will emit a warning the first time that function is called.
 *
 * @param fn the function to mark as deprecated.
 * @param key a unique key identifying the function.
 * @param message the warning message.
 *
 * @return a wrapped function
 */
function deprecate(fn, key, message) {
    return function(...args) {
        if (!didWarnForDeprecation[key]) {
            didWarnForDeprecation[key] = true;
            console.warn(message);
        }
        fn.call(this, ...args);
    };
}

export = deprecate;
