import { NativeModules } from "react-native";
import deepMapKeys from "deep-map-keys";
import * as base64 from "base64-js";
import * as $protobuf from "protobufjs";
import { lnrpc } from "../../proto/proto";

const { LndMobile } = NativeModules;

export interface ISendRequestClass<IReq, Req> {
  create: (options: IReq) => Req;
  encode: (request: Req) => $protobuf.Writer;
}

export interface ISendResponseClass<Res> {
  decode: (reader: $protobuf.Reader | Uint8Array) => Res;
  toObject(message: Res, options?: $protobuf.IConversionOptions): { [k: string]: any };
}

export interface ISyncCommandOptions<IReq, Req, Res> {
    request: ISendRequestClass<IReq, Req>;
    response: ISendResponseClass<Res>;
    method: string;
    options: IReq;
}

export interface IStreamCommandOptions<IReq, Req> {
    request: ISendRequestClass<IReq, Req>;
    method: string;
    options: IReq;
}

export interface IStreamResultOptions<Res> {
  base64Result: string;
  response: ISendResponseClass<Res>;
}

/**
 * @throws
 */
export const sendCommand = async <IReq, Req, Res>({ request, response, method, options }: ISyncCommandOptions<IReq, Req, Res>): Promise<Res> => {
  try {
    const instance = request.create(options);
    const b64 = await LndMobile.sendCommand(method, base64.fromByteArray(request.encode(instance).finish()));
    return response.decode(base64.toByteArray(b64.data));
  } catch (e) { throw e; }
};

export const sendStreamCommand = async <IReq, Req>({ request, method, options }: IStreamCommandOptions<IReq, Req>, streamOnlyOnce: boolean = false): Promise<string> =>  {
  const instance = request.create(options);
  const response = await LndMobile.sendStreamCommand(method, base64.fromByteArray(request.encode(instance).finish()), streamOnlyOnce);
  return response;
};

export const decodeStreamResult = <Res>( { base64Result, response }: IStreamResultOptions<Res>): Res => {
  return response.decode(base64.toByteArray(base64Result));
};
