import { NativeModules } from "react-native";
import { fixGrpcJsonResponse } from "./utils";
const { LndGrpc } = NativeModules;

export interface IGenSeedResponse {
}
/**
 * @throws
 */
export const GenSeed = async (): Promise<IGenSeedResponse> => {
  try {
    const responseString = await LndGrpc.pendingChannels();
    const response = fixGrpcJsonResponse<IGenSeedResponse>(JSON.parse(responseString));
    return response;
  } catch (e) { throw JSON.parse(e.message); }
};
