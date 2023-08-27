import { Thunk, thunk } from "easy-peasy";

import { ILightningModel } from "./Lightning";
import { IStoreInjections } from "./store";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { bytesToHexString } from "../utils";
import logger from "./../utils/log";
import { IStoreModel } from "./index";

const log = logger("ChannelRpcInterceptor");

export interface IChannelRpcInterceptorModel {
  initialize: Thunk<ILightningModel, void, IStoreInjections, IStoreModel>;
}

export const channelRpcInterceptor: IChannelRpcInterceptorModel = {
  initialize: thunk(async (actions, _, { getStoreState, injections }) => {
    LndMobileEventEmitter.addListener("ChannelAcceptor", async (event) => {
      try {
        let isZeroConfAllowed = false;

        const channelAcceptRequest = injections.lndMobile.channel.decodeChannelAcceptRequest(
          event.data,
        );

        log.i("channelAcceptRequest", [channelAcceptRequest]);

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
        console.error("channel acceptance error: " + error.message);
      }
    });

    await injections.lndMobile.channel.channelAcceptor();
  }),
};
