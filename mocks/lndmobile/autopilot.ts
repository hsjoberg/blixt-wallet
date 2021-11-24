import { autopilotrpc } from "../../proto/lightning";

/**
 * @throws
 */
export const status = async (): Promise<autopilotrpc.StatusResponse> => {
  const response = autopilotrpc.StatusResponse.create({
    active: false,
  });
  return response;
};

/**
 * @throws
 */
export const modifyStatus = async (enable: boolean): Promise<autopilotrpc.ModifyStatusResponse> => {
  const response = autopilotrpc.ModifyStatusResponse.create({});
  return response;
};

/**
 * @throws
 */
export const queryScores = async (): Promise<autopilotrpc.QueryScoresResponse> => {
  const response = autopilotrpc.QueryScoresResponse.create({
    results: [{
      heuristic: null,
      scores: {},
    }],
  });
  return response;
};

/**
 * @throws
 */
export const setScores = async (scores: {[k: string]: number}): Promise<autopilotrpc.SetScoresResponse> => {
  const response = autopilotrpc.SetScoresResponse.create({});
  return response;
};
