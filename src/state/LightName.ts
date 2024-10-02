import { Thunk, thunk } from "easy-peasy";

import { IStoreModel } from ".";
import logger from "./../utils/log";
import {
  RouteHint,
  RouteHintSchema,
  RoutingPolicy,
} from "react-native-turbo-lnd/protos/lightning_pb";
import { getChanInfo, listChannels } from "react-native-turbo-lnd";
import { create } from "@bufbuild/protobuf";

const log = logger("LightName");

const LIGHT_NAME_API_SERVER = "http://192.168.1.109:3000/";

interface ILightNameModelRegisterPayload {
  username: string;
}

export interface ILightNameModel {
  initialize: Thunk<ILightNameModel>;

  register: Thunk<ILightNameModel, ILightNameModelRegisterPayload, any, IStoreModel>;

  username?: string;
}

export const lightName: ILightNameModel = {
  initialize: thunk(async (actions, _, {}) => {
    log.i("Initializing LightName subsystem");
  }),

  register: thunk(async (actions, payload, { getStoreState }) => {
    try {
      const routeHints = await getRouteHints();
      log.i("", [routeHints]);
      const result = await sendRequest("registerAccount", undefined, {
        username: payload.username,
        routeHints,
        publicKey: getStoreState().lightning.nodeInfo?.identityPubkey,
      });

      console.log(result);
    } catch (e) {
      log.i("Error", [e]);
    }
  }),
};

// TODO(hsjoberg) move into model?
const getRouteHints = async () => {
  const routeHints: RouteHint[] = [];
  const channels = await listChannels({
    privateOnly: true,
  });

  // Follows the code in `addInvoice()` of the lnd project
  for (const channel of channels.channels) {
    const chanInfo = await getChanInfo({
      chanId: channel.chanId,
    });
    const remotePubkey = channel.remotePubkey;

    console.log("chanInfo", chanInfo);

    // TODO check if node is publicly advertised in the network graph
    // https://github.com/lightningnetwork/lnd/blob/38b521d87d3fd9cff628e5dc09b764aeabaf011a/channeldb/graph.go#L2141

    let policy: RoutingPolicy;
    if (remotePubkey === chanInfo.node1Pub) {
      policy = chanInfo.node1Policy!;
    } else {
      policy = chanInfo.node2Policy!;
    }

    if (!policy || !policy.timeLockDelta) {
      continue;
    }

    routeHints.push(
      create(RouteHintSchema, {
        hopHints: [
          {
            nodeId: remotePubkey,
            chanId: chanInfo.channelId,
            feeBaseMsat: policy.feeBaseMsat ? Number(policy.feeBaseMsat) : undefined,
            feeProportionalMillionths: policy.feeRateMilliMsat
              ? Number(policy.feeRateMilliMsat)
              : undefined,
            cltvExpiryDelta: policy.timeLockDelta,
          },
        ],
      }),
    );
  }

  return routeHints;
};

const sendRequest = async (request: string, getData?: URLSearchParams, postData?: any) => {
  let requestUrl = LIGHT_NAME_API_SERVER + request;
  if (getData) {
    requestUrl += getData;
  }
  log.i(requestUrl);

  const result = await fetch(requestUrl, {
    method: "POST",
    headers: postData
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: postData ? JSON.stringify(postData) : undefined,
  });

  return await result.json();
};
