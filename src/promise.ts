/* global Promise */
import polyfill from 'es6-promise';

// istanbul ignore next
export = typeof Promise === 'undefined'
    ? // Cast the polyfill version to **any** to lose the implementation's
      // details, then to PromiseConstructor so it matches the native
      // implementation. Otherwise this file exports a type union of
      // polyfill.Promise and PromiseContructor. Since those are different it
      // makes it hard or not possible to fulfill the right types when creating
      // new Promises.
      ((polyfill.Promise as any) as PromiseConstructor)
    : Promise;
