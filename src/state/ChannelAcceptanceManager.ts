import { Thunk, thunk } from "easy-peasy";

import { ILightningModel } from "./Lightning";
import { IStoreInjections } from "./store";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { bytesToHexString } from "../utils";
import logger from "./../utils/log";
import { IStoreModel } from "./index";
import { checkLndStreamErrorResponse } from "../utils/lndmobile";
import { lnrpc } from "../../proto/lightning";

const log = logger("ChannelAcceptanceManager");

export interface IChannelAcceptanceManagerModel {
  initialize: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;
}

export const channelAcceptanceManager: IChannelAcceptanceManagerModel = {
  initialize: thunk(async (actions, _, { getStoreState, injections }) => {
    LndMobileEventEmitter.addListener("ChannelAcceptor", async (event) => {
      try {
        const error = checkLndStreamErrorResponse("SubscribeChannelEvents", event);
        if (error === "EOF") {
          return;
        } else if (error) {
          log.d("Got error from SubscribeChannelEvents", [error]);
          throw error;
        }

        let isZeroConfAllowed = false;

        const channelAcceptRequest = injections.lndMobile.channel.decodeChannelAcceptRequest(
          event.data,
        );

        log.i("Channel accept request", [channelAcceptRequest]);

        // Reject unknown, legacy and static remote key channels

        if (
          channelAcceptRequest.commitmentType === lnrpc.CommitmentType.LEGACY ||
          channelAcceptRequest.commitmentType === lnrpc.CommitmentType.STATIC_REMOTE_KEY ||
          channelAcceptRequest.commitmentType === lnrpc.CommitmentType.UNKNOWN_COMMITMENT_TYPE
        ) {
          await injections.lndMobile.channel.channelAcceptorResponse(
            channelAcceptRequest.pendingChanId,
            false,
          );
          return;
        }

        if (!!channelAcceptRequest.wantsZeroConf) {
          const zeroConfPeers = getStoreState().settings.zeroConfPeers;

          isZeroConfAllowed = !!zeroConfPeers
            ? zeroConfPeers.includes(bytesToHexString(channelAcceptRequest.nodePubkey))
            : false;
        }

        await injections.lndMobile.channel.channelAcceptorResponse(
          channelAcceptRequest.pendingChanId,
          !channelAcceptRequest.wantsZeroConf || isZeroConfAllowed,
          isZeroConfAllowed,
        );
      } catch (error) {
        log.e("Channel acceptance error: ", [error]);
      }
    });

    await injections.lndMobile.channel.channelAcceptor();
  }),
};
