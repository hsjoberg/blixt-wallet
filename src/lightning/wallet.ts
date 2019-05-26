import { NativeModules } from "react-native";
import { fixGrpcJsonResponse } from "./utils";
const { LndGrpc } = NativeModules;

// /**
//  * @throws
//  */
// export const pendingChannels = async (): Promise<IPendingChannelsResponse> => {
//   try {
//     const responseString = await LndGrpc.pendingChannels();
//     const response = fixGrpcJsonResponse<IPendingChannelsResponse>(JSON.parse(responseString));
//     return response;
//   } catch (e) { throw JSON.parse(e.message); }
// };
