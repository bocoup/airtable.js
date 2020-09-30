// istanbul ignore file
let AbortController: new () => AbortController;

if (typeof window === 'undefined' && typeof Request === 'undefined') {
    AbortController = require('abort-controller');
} else if ('signal' in new Request('') && typeof window.AbortController !== 'undefined') {
    AbortController = window.AbortController;
} else {
    const polyfill = require('abortcontroller-polyfill/dist/cjs-ponyfill');
    AbortController = polyfill.AbortController;
}

export = AbortController;
