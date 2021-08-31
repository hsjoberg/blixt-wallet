import { useStoreState } from "../state/store";

export default function useLightningReadyToSend() {
  const lightningReady = useStoreState((store) => store.lightning.ready);
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const syncedToGraph = useStoreState((store) => store.lightning.syncedToGraph);
  const requireGraphSync = useStoreState((store) => store.settings.requireGraphSync);
  const channels = useStoreState((store) => store.channel.channels);

  return (
    lightningReady &&
    rpcReady &&
    syncedToChain &&
    (!requireGraphSync || syncedToGraph) &&
    channels.some((channel) => channel.active)
  );
}
