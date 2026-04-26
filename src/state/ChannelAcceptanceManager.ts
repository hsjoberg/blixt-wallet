import { Thunk, thunk } from "easy-peasy";

import { ILightningModel } from "./Lightning";
import { bytesToHexString } from "../utils";
import { IStoreModel } from "./index";

import { channelAcceptor } from "react-native-turbo-lnd";
import { CommitmentType } from "react-native-turbo-lnd/protos/lightning_pb";

import logger from "../utils/log";
const log = logger("ChannelAcceptanceManager");

export interface IChannelAcceptanceManagerModel {
  initialize: Thunk<ILightningModel, void, any, IStoreModel>;
}

export const channelAcceptanceManager: IChannelAcceptanceManagerModel = {
  initialize: thunk(async (_, _2, { getStoreState }) => {
    log.i("Starting Channel Acceptor", []);

    const { send, close } = channelAcceptor(
      (event) => {
        log.i("Channel request received: ", [event]);
        let isZeroConfAllowed = false;

        if (
          event.commitmentType === CommitmentType.LEGACY ||
          event.commitmentType === CommitmentType.STATIC_REMOTE_KEY ||
          event.commitmentType === CommitmentType.UNKNOWN_COMMITMENT_TYPE
        ) {
          log.i("Rejecting channel request due to commitment type: ", [
            CommitmentType[event.commitmentType],
          ]);

          send({
            accept: false,
            pendingChanId: event.pendingChanId,
            error: "Only anchor channels are allowed",
          });

          return;
        }

        if (!!event.wantsZeroConf) {
          const zeroConfPeers = getStoreState().settings.zeroConfPeers;

          isZeroConfAllowed = !!zeroConfPeers
            ? zeroConfPeers.includes(bytesToHexString(event.nodePubkey))
            : false;
        }

        log.i("Accepting channel request from", [
          bytesToHexString(event.nodePubkey),
          event.commitmentType,
        ]);

        send({
          pendingChanId: event.pendingChanId,
          accept: !event.wantsZeroConf || isZeroConfAllowed,
          zeroConf: isZeroConfAllowed,
        });
      },
      (error) => {
        log.e("Channel acceptance error: ", [error]);
        close();
      },
    );
  }),
};
