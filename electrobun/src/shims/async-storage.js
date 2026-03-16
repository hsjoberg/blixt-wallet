import { electrobunRequest } from "../shared/rpc-client.web";

const createPromise = (executor, callback) => {
  return new Promise((resolve, reject) => {
    executor()
      .then((value) => {
        if (callback) {
          callback(null, value);
        }
        resolve(value);
      })
      .catch((error) => {
        const normalized = error instanceof Error ? error : new Error(String(error));
        if (callback) {
          callback(normalized);
        }
        reject(normalized);
      });
  });
};

const createPromiseAll = (executor, callback) => createPromise(executor, callback);

const AsyncStorage = {
  getItem: (key, callback) =>
    createPromise(() => electrobunRequest("__BlixtKvGetItem", { key }), callback),

  setItem: (key, value, callback) =>
    createPromise(
      async () => {
        await electrobunRequest("__BlixtKvSetItem", { key, value });
      },
      callback,
    ),

  removeItem: (key, callback) =>
    createPromise(
      async () => {
        await electrobunRequest("__BlixtKvRemoveItem", { key });
      },
      callback,
    ),

  mergeItem: (key, value, callback) =>
    createPromise(
      async () => {
        await electrobunRequest("__BlixtKvMergeItem", { key, value });
      },
      callback,
    ),

  clear: (callback) =>
    createPromise(
      async () => {
        await electrobunRequest("__BlixtKvClear", {});
      },
      callback,
    ),

  getAllKeys: (callback) => createPromise(() => electrobunRequest("__BlixtKvGetAllKeys", {}), callback),

  flushGetRequests: () => undefined,

  multiGet: (keys, callback) =>
    createPromiseAll(() => electrobunRequest("__BlixtKvMultiGet", { keys }), callback),

  multiSet: (keyValuePairs, callback) =>
    createPromiseAll(
      async () => {
        await electrobunRequest("__BlixtKvMultiSet", {
          entries: keyValuePairs,
        });
      },
      callback,
    ),

  multiRemove: (keys, callback) =>
    createPromiseAll(
      async () => {
        await electrobunRequest("__BlixtKvMultiRemove", { keys });
      },
      callback,
    ),

  multiMerge: (keyValuePairs, callback) =>
    createPromiseAll(
      async () => {
        await electrobunRequest("__BlixtKvMultiMerge", {
          entries: keyValuePairs,
        });
      },
      callback,
    ),
};

export default AsyncStorage;
