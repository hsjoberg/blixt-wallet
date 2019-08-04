import * as base64 from "base64-js";
import * as $protobuf from "protobufjs";

export interface ISendResponseClass<Res> {
  decode: (reader: $protobuf.Reader | Uint8Array) => Res;
  toObject(message: Res, options?: $protobuf.IConversionOptions): { [k: string]: any };
}

export interface IStreamResultOptions<Res> {
  base64Result: string;
  response: ISendResponseClass<Res>;
}

export const decodeStreamResult = <Res>( { base64Result, response }: IStreamResultOptions<Res>): Res => {
  return response.decode(base64.toByteArray(base64Result));
};

export const timeout = (time: number) => new Promise((resolve) => setTimeout(() => resolve(), time));
