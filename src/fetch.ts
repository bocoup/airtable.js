import nodeFetch from 'node-fetch';

export = (
    // istanbul ignore next
    (typeof window === 'undefined' || typeof fetch === 'undefined') ? (nodeFetch as typeof fetch) : fetch
);
