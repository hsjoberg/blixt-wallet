import React, { useLayoutEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Icon, Text, Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import Clipboard from "@react-native-clipboard/clipboard";

import Container from "../../components/Container";
import { useStoreActions, useStoreState } from "../../state/store";
import { NavigationButton } from "../../components/NavigationButton";
import { SettingsStackParamList } from "./index";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { timeout, toast } from "../../utils";
import Loading from "../../components/Loading";

export interface ISelectListProps {
  navigation: StackNavigationProp<SettingsStackParamList, "DunderDoctor">;
  route: RouteProp<SettingsStackParamList, "DunderDoctor">;
}

export default function DunderDoctor({ navigation }: ISelectListProps) {
  const [running, setRunning] = useState(false);
  const syncedToChain = useStoreState((store) => store.lightning.syncedToChain);
  const serviceStatus = useStoreActions((store) => store.blixtLsp.ondemandChannel.serviceStatus);
  const checkStatus = useStoreActions((store) => store.blixtLsp.ondemandChannel.checkStatus);
  const claim = useStoreActions((store) => store.blixtLsp.ondemandChannel.claim);
  const connectPeer = useStoreActions((store) => store.lightning.connectPeer);
  const [log, setLog] = useState<string[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Dunder Doctor",
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={onPressCopy}>
            <Icon type="MaterialCommunityIcons" name="content-copy" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      },
    });
  }, [navigation]);

  const pushLog = (message: string) => {
    setLog((currLog) => {
      const newLog = currLog.slice(0);
      newLog.push(message);
      return newLog;
    });
  };

  const onPressCopy = () => {
    Clipboard.setString(log.join("\n"));
    toast("Copied to clipboard");
  };

  const runDiagnostic = async () => {
    setRunning(true);
    await (async () => {
      setLog([]);
      pushLog("Checking if Dunder is available...");

      const serviceStatusResult = await serviceStatus();
      if (!serviceStatusResult.status) {
        pushLog("Dunder is currently not available, please try again later.");
        pushLog("Done.");
        return;
      }

      pushLog("Service is online.");

      pushLog("Checking for funds on the Dunder server...");
      const checkStatusResult = await checkStatus();
      console.log(checkStatusResult);
      if (checkStatusResult.unclaimedAmountSat === 0) {
        pushLog("Dunder reports no remote funds available.");
        pushLog("Done.");
        return;
      }

      pushLog(`Funds available on Dunder: ${checkStatusResult.unclaimedAmountSat}.`);
      pushLog(`Connecting to node in an attempt to claim these funds...`);

      let attempt = 3;
      const connected = await (async () => {
        while (attempt--) {
          try {
            pushLog("Connecting to Dunder's Lightning node...");
            await connectPeer(serviceStatusResult.peer);
            return true;
          } catch (e: any) {
            if (!e.message.includes("already connected to peer")) {
              pushLog(`Failed to connect: ${e.message}.`);
              await timeout(5000);
            } else {
              pushLog("Already connected.");
              pushLog("Running claim funds request.");
              const claimRequest = await claim();
              if (claimRequest.status === "OK") {
                pushLog("Got OK from Dunder");
              } else {
                pushLog(`Got ERROR from Dunder: ${(claimRequest as any).reason}`);
              }
              break;
            }
          }
        }
      })();

      if (!connected) {
        pushLog("Failed to connect to Dunder's Lightning node. Try again later.");
        pushLog("Done.");
      } else {
        pushLog("Connected to Dunder's Lightning node.");
        pushLog("Done.");
      }
    })();
    setRunning(false);
  };

  if (!syncedToChain) {
    return (
      <Container>
        <Loading />
      </Container>
    );
  }

  return (
    <Container>
      <View style={{ flex: 1, padding: 14 }}>
        <ScrollView
          contentContainerStyle={{ padding: 10 }}
          style={{ backgroundColor: blixtTheme.gray, marginTop: 10, marginBottom: 20, flex: 1 }}
        >
          {log.map((logItem, i) => (
            <Text key={i}>{logItem}</Text>
          ))}
        </ScrollView>
        <Button onPress={runDiagnostic} block={true} primary={true} disabled={running}>
          {running ? <Spinner color={blixtTheme.light} /> : <Text>Run</Text>}
        </Button>
      </View>
    </Container>
  );
}
