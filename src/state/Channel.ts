import { Thunk, thunk, Action, action } from "easy-peasy";
import { listChannels, openChannel, closeChannel, pendingChannels } from "../lndmobile/channel";
import { connectPeer } from "../lndmobile";
import { lnrpc } from "../../proto/proto";

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
  setChannels: Action<IChannelModel, lnrpc.IChannel[]>;
  setPendingOpenChannels: Action<IChannelModel, lnrpc.PendingChannelsResponse.IPendingOpenChannel[]>;

  connectAndOpenChannel: Thunk<IChannelModel, IOpenChannelPayload>;
  closeChannel: Thunk<IChannelModel, ICloseChannelPayload>;

  channels: lnrpc.IChannel[];
  pendingOpenChannels: lnrpc.PendingChannelsResponse.IPendingOpenChannel[];
}

export const channel: IChannelModel = {
  getChannels: thunk(async (actions) => {
    const channels = await listChannels();
    actions.setChannels(channels.channels);

    const pending =  await pendingChannels();
    actions.setPendingOpenChannels(pending.pendingOpenChannels);
  }),

  setChannels: action((state, payload) => {
    state.channels = payload;
  }),

  setPendingOpenChannels: action((state, payload) => {
    state.pendingOpenChannels = payload;
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
  pendingOpenChannels: [],
};
