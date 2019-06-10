import { AppState, NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";
import { listChannels, IChannel, openChannel, closeChannel } from "../lightning/channel";
import { connectPeer } from "../lightning";

export interface IOpenChannelPayload {
  // <pubkey>@<ip>[:<port>]
  peer: string;
  amount: number;
}

export interface ICloseChannelPayload {
  fundingTx: string;
  outputIndex: number;
}

export interface IChannelModel {
  getChannels: Thunk<IChannelModel>;
  setChannels: Action<IChannelModel, IChannel[]>;

  connectAndOpenChannel: Thunk<IChannelModel, IOpenChannelPayload>;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload>;

  channels: IChannel[];
}

export const channel: IChannelModel = {
  getChannels: thunk(async (actions) => {
    const response = await listChannels();
    actions.setChannels(response.channels);
  }),

  setChannels: action((state, payload) => {
    state.channels = payload;
  }),

  connectAndOpenChannel: thunk(async (_, { peer, amount }) => {
    const [pubkey, host] = peer.split("@");
    await connectPeer(pubkey, host);

    const result = await openChannel(pubkey, amount);
    console.log(result);
    return result;
  }),

  closeChannel: thunk(async (_, { fundingTx, outputIndex }) => {
    const result = await closeChannel(fundingTx, outputIndex);
    console.log(result);
    return result;
  }),

  channels: [],
};
