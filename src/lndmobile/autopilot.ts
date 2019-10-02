import { sendCommand } from "./utils";
import { autopilotrpc } from "../../proto/proto-autopilot";

/**
 * @throws
 */
export const status = async (): Promise<autopilotrpc.StatusResponse> => {
  const response = await sendCommand<autopilotrpc.IStatusRequest, autopilotrpc.StatusRequest, autopilotrpc.StatusResponse>({
    request: autopilotrpc.StatusRequest,
    response: autopilotrpc.StatusResponse,
    method: "Status",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const modifyStatus = async (enable: boolean): Promise<autopilotrpc.ModifyStatusResponse> => {
  const response = await sendCommand<autopilotrpc.IModifyStatusRequest, autopilotrpc.ModifyStatusRequest, autopilotrpc.ModifyStatusResponse>({
    request: autopilotrpc.ModifyStatusRequest,
    response: autopilotrpc.ModifyStatusResponse,
    method: "ModifyStatus",
    options: {
      enable,
    },
  });
  return response;
};

/**
 * @throws
 */
export const queryScores = async (): Promise<autopilotrpc.QueryScoresResponse> => {
  const response = await sendCommand<autopilotrpc.IQueryScoresRequest, autopilotrpc.QueryScoresRequest, autopilotrpc.QueryScoresResponse>({
    request: autopilotrpc.QueryScoresRequest,
    response: autopilotrpc.QueryScoresResponse,
    method: "QueryScores",
    options: {},
  });
  return response;
};

/**
 * @throws
 */
export const setScores = async (scores: {[k: string]: number}): Promise<autopilotrpc.SetScoresResponse> => {
  const response = await sendCommand<autopilotrpc.ISetScoresRequest, autopilotrpc.SetScoresRequest, autopilotrpc.SetScoresResponse>({
    request: autopilotrpc.SetScoresRequest,
    response: autopilotrpc.SetScoresResponse,
    method: "SetScores",
    options: {
      heuristic: "externalscore",
      scores
    },
  });
  console.log(response);
  return response;
};
