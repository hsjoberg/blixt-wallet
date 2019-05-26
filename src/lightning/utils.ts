import deepMapKeys from "deep-map-keys";

export const fixGrpcJsonResponse = <T>(response: { [keys: string]: any })  =>
  deepMapKeys<T>(response, (key) => {
    if (key[key.length - 1] === "_") {
      return key.slice(0, -1);
    }
    return "$" + key;
});
