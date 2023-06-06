import { StorageItem, getItemObject } from "../storage/app";
import { Thunk, thunk } from "easy-peasy";

import { ILightningModel } from "./Lightning";
import { IStoreInjections } from "./store";
import { LndMobileEventEmitter } from "../utils/event-listener";
import { bytesToHexString } from "../utils";
import logger from "./../utils/log";

const log = logger("ScheduledSync");

export interface IChannelRpcInterceptorModel {
  initialize: Thunk<ILightningModel, void, IStoreInjections>;
}

export const channelRpcInterceptor: IChannelRpcInterceptorModel = {
  initialize: thunk(async (actions, _, { getState, injections }) => {
    LndMobileEventEmitter.addListener("ChannelAcceptor", async (event) => {
      try {
        let isZeroConfAllowed = false;

        const channelAcceptRequest = injections.lndMobile.channel.decodeChannelAcceptRequest(
          event.data,
        );

        if (!!channelAcceptRequest.wantsZeroConf) {
          const zeroConfPeers = await getItemObject<string[]>(StorageItem.zeroConfPeers);

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
