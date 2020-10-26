import crossFetch from 'cross-fetch';

export = (
    // istanbul ignore next
    typeof fetch === 'undefined' ? (crossFetch as typeof fetch) : fetch
);
