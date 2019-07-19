import { NativeModules } from "react-native";
import deepMapKeys from "deep-map-keys";
import * as base64 from "base64-js";

export interface ISendRequestClass<IReq> {
  create: (options: IReq) => any;
  encode: (request: any) => any;
}

export interface ISendResponseClass {
  decode: (response: any) => any;
}

export interface ISendOptions<IReq> {
    request: ISendRequestClass<IReq>;
    response: ISendResponseClass;
    method: string;
    options: IReq;
}

export const sendCommand = async <IReq, IRes>({request, response, method, options }: ISendOptions<IReq>): Promise<IRes> =>  {
  const instance = request.create(options);
  const b64 = await NativeModules.LndMobile.sendCommand(method, base64.fromByteArray(request.encode(instance).finish()));
  return response.decode(base64.toByteArray(b64.data));
};


export const fixGrpcJsonResponse = <T>(response: { [keys: string]: any })  =>
  deepMapKeys<T>(response, (key) => {
    if (key[key.length - 1] === "_") {
      return key.slice(0, -1);
    }
    return "$" + key;
});
