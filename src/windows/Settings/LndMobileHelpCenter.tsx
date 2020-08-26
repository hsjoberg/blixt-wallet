import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, ScrollView, View, NativeModules, DeviceEventEmitter } from "react-native";
import { Card, Text, CardItem, H1, Button, Spinner } from "native-base";

import Blurmodal from "../../components/BlurModal";
import { useStoreState } from "../../state/store";
import { getInfo, ELndMobileStatusCodes, startLnd } from "../../lndmobile";
import { newAddress } from "../../lndmobile/onchain";
import { toast } from "../../utils";
import { getWalletPassword } from "../../storage/keystore";
import { unlockWallet } from "../../lndmobile/wallet";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import Color from "color";
import Clipboard from "@react-native-community/clipboard";

interface IStepsResult {
  title: string;
  result: boolean | string;
  error?: Error;
}

export default function LndMobileHelpCenter({ navigation }) {
  const [runningSteps, setRunningSteps] = useState(false);
  const [stepsResult, setStepsResult] = useState<IStepsResult[]>([]);
  const [lndLog, setLndLog] = useState<string[]>([]);
  const logScrollView = useRef<ScrollView>();

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("lndlog", (data: string) => {
      console.log("lndlog: " + data);
      lndLog.push(data.slice(11));
      setLndLog(lndLog.slice(0));
    });

    NativeModules.LndMobile.observeLndLogFile();

    return () => {
      listener.remove();
    };
  }, []);

  const steps = [{
      title: "Check LndMobileService process exist",
      async exec () {
        const r = await NativeModules.LndMobile.checkLndProcessExist();
        return r;
      }
    },{
      title: "Check LndMobileService connected",
      async exec () {
          const r = await NativeModules.LndMobile.checkLndMobileServiceConnected();
          return r;
      },
    }, {
      title: "Ping LndMobileService",
      async exec () {
        const r = await NativeModules.LndMobile.sendPongToLndMobileservice();
        return true;
      }
    }, {
      title: "Check status",
      async exec () {
        const result = await NativeModules.LndMobile.checkStatus();

        let status = "";
        if ((result & ELndMobileStatusCodes.STATUS_SERVICE_BOUND) === ELndMobileStatusCodes.STATUS_SERVICE_BOUND) {
          status += "STATUS_SERVICE_BOUND\n";
        }
        if ((result & ELndMobileStatusCodes.STATUS_PROCESS_STARTED) === ELndMobileStatusCodes.STATUS_PROCESS_STARTED) {
          status += "STATUS_PROCESS_STARTED\n";
        }
        if ((result & ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) === ELndMobileStatusCodes.STATUS_WALLET_UNLOCKED) {
          status += "STATUS_WALLET_UNLOCKED\n";
        }

        return status.trimRight();
      }
    }, {
      title: "Lnd GetInfo",
      async exec () {
        const r = await getInfo();
        if (r && r.identityPubkey) {
          return true;
        }
      }
    }, {
      title: "Lnd NewAddress",
      async exec () {
        const r = await newAddress();
        if (r && r.address) {
          return true;
        }
        return false;
      }
    }, {
      title: "Test Done",
      async exec () {
        return true;
      }
    }
  ];

  async function onPressDoTest() {
    setRunningSteps(true);
    const stepsRes: IStepsResult[] = [];
    for (const step of steps) {
      let continueSteps = true;
      const timeout = setTimeout(() => {
        stepsRes.push({
          title: step.title,
          result: false,
          error: new Error("Failed waiting for response"),
        });
        setStepsResult(stepsRes.slice(0));
        setRunningSteps(false);
        continueSteps = false;
      }, 1000 * 10);
      try {
        const result = await step.exec();
        stepsRes.push({
          title: step.title,
          result,
        });
        if (!continueSteps) {
          break;
        }
        setStepsResult(stepsRes.slice(0));
        if (!result) {
          break;
        }
      } catch (e) {
        stepsRes.push({
          title: step.title,
          result: false,
          error: e,
        });
        setStepsResult(stepsRes.slice(0));
        break;
      }
      clearTimeout(timeout);
    }
    // setStepsResult(stepsRes);
    setRunningSteps(false);
  }

  const runInit = async () => {
    try {
      const result = await NativeModules.LndMobile.init();
      toast("Result: " + result, 0, "success", "OK");
    } catch (e) {
      toast("Error: " + e.message, 0, "danger", "OK");
    }
  };

  const runStartLnd = async () => {
    try {
      const result = await startLnd(false);
      toast("Result: " + JSON.stringify(result), 0, "success", "OK");
    } catch (e) {
      toast("Error: " + e.message, 0, "danger", "OK");
    }
  };

  const runUnlockWallet = async () => {
    const password = await getWalletPassword();
    await unlockWallet(password!);
  };

  const runSigKill = async () => {
    try {
      const result = await NativeModules.LndMobile.killLnd();
      toast("Result: " + JSON.stringify(result), 0, "success", "OK");
    } catch (e) {
      toast("Error: " + e.message, 0, "danger", "OK");
    }
  };

  const runCopyLndLog = async () => {
    Clipboard.setString(lndLog.join("\n"));
    toast("Copied lnd log to clipboard");
  };

  return (
    <Blurmodal useModalComponent={false}>
      <View style={style.container}>
        <Card style={style.card}>
          <CardItem style={style.cardStyle}>
            <View style={style.headerContainer}>
              <H1 style={style.header}>
                LndMobile Help Center
              </H1>
              <Button  small info disabled={runningSteps} style={{width: 80, justifyContent: "center" }} onPress={onPressDoTest}>
                {!runningSteps && <Text style={{ fontSize: 12 }}>Do Test</Text>}
                {runningSteps && <Spinner size="small" color={blixtTheme.light} />}
              </Button>
            </View>
            <View style={{ flex: 1, padding: 3, backgroundColor: Color(blixtTheme.gray).darken(0.2).hex(), marginBottom: 10, width:"100%" }}>
              {stepsResult.map((stepResult, i) => {
                return (
                  <View style={style.resultItem} key={i}>
                    <Text>{stepResult.title}</Text>

                    <View style={{ flex:1, flexDirection:"column",  alignItems:"flex-end" }}>
                      {typeof stepResult.result === "boolean" &&
                        <View style={stepResult.result ? style.resultOk : style.resultBad} />
                      }
                      {typeof stepResult.result === "string" &&
                        <Text style={{textAlign:"right", fontSize:12}}>
                          {stepResult.result}
                        </Text>
                      }

                      {stepResult.error && <Text>{stepResult.error.message}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ flex: 0.75, padding: 3, width:"100%", backgroundColor: Color(blixtTheme.gray).darken(0.2).hex() }}>
              <ScrollView ref={logScrollView} onContentSizeChange={() => logScrollView.current?.scrollToEnd()}>
                {lndLog.map((text, i) => {
                  return (
                    <Text key={i} style={{ fontSize: 11 }}>{text}</Text>
                  );
                })}
              </ScrollView>
            </View>
            <View style={{flexDirection: "row",  flexWrap:"wrap", justifyContent:"flex-end"}}>
              <Button small style={style.actionButton} onPress={runInit}><Text>init</Text></Button>
              <Button small style={style.actionButton} onPress={runStartLnd}><Text>startLnd</Text></Button>
              <Button small style={style.actionButton} onPress={runUnlockWallet}><Text>unlockWallet</Text></Button>
              <Button small style={style.actionButton} onPress={runCopyLndLog}><Text>Copy lnd log</Text></Button>
              <Button small danger style={style.actionButton} onPress={runSigKill}><Text>SIGKILL LndMobileService</Text></Button>
              <Button small dark style={style.actionButton} onPress={() => navigation.pop()}><Text>Exit</Text></Button>
            </View>
          </CardItem>
        </Card>
      </View>
    </Blurmodal>
  );
};

const style = StyleSheet.create({
  container: { flex:1, margin: 5, justifyContent:"center" },
  card: {
    padding: 0,
    width: "100%",
    minHeight: "85%",
  },
  cardStyle: {
    flex:1,
    flexDirection: "column",
    alignItems: "flex-start",
    paddingTop: 9,
    paddingLeft:9,
    paddingRight:9,
    paddingBottom: 9,
  },
  headerContainer: {
    width:"100%",
    flexDirection:"row",
    justifyContent:"space-between",
  },
  header: {
    fontWeight: "bold",
    fontSize: 23,
    marginBottom: 8,
  },
  resultItem: {
    paddingBottom: 2,
    marginBottom: 2,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#2f2f2f",
    borderBottomWidth: 0.3,
    alignItems: "center",
  },
  resultOk: {
    marginTop: 2,
    width: 9,
    height: 9,
    borderRadius: 8,
    backgroundColor:"green",
  },
  resultBad: {
    marginTop: 2,
    width: 9,
    height: 9,
    borderRadius: 8,
    backgroundColor:"red",
  },
  actionButton: {
    margin: 5,
  }
});
