import React, { useEffect, useState } from "react";
import { StatusBar, Vibration } from "react-native";
import { Spinner } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import DialogAndroid from "react-native-dialogs";
import Long from "long";

import Container from "../../components/Container";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import { RootStackParamList } from "../../Main";
import { getDomainFromURL, toast, timeout } from "../../utils";
import { ILNUrlWithdrawRequest } from "../../state/LNURL";
import { convertBitcoinUnit, formatBitcoin, BitcoinUnits } from "../../utils/bitcoin-units";

interface IWithdrawRequestProps {
  navigation: StackNavigationProp<{}>;
}
export default function LNURLChannelRequest({ navigation }: IWithdrawRequestProps) {
  const [status, setStatus] = useState<"PROMPT" | "PROCESSING" | "DONE">("PROMPT");
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const type = useStoreState((store) => store.lnUrl.type);
  const doWithdrawRequest = useStoreActions((store) => store.lnUrl.doWithdrawRequest);
  const lnObject = useStoreState((store) => store.lnUrl.lnUrlObject) as unknown as ILNUrlWithdrawRequest;
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);

  const doRequest = async (domain: string, satoshi: number) => {
    try {
      setStatus("PROCESSING");
      const result = await doWithdrawRequest({ satoshi });
      setStatus("DONE");
      clear();
      Vibration.vibrate(32);
      toast(
        `Sent withdrawal request to ${domain}`,
        10000,
        "success",
        "Okay"
      );
      navigation.pop();
    } catch (e) {
      console.log(e);
      setStatus("DONE");
      clear();
      Vibration.vibrate(50);
      toast(
        "Error: " + e.message,
        12000,
        "warning",
        "Okay"
      );
      navigation.pop();
    }
  };

  useEffect(() => {
    if (status !== "PROMPT") {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      if (type === "withdrawRequest") {
        await timeout(100);
        const domain = getDomainFromURL(lnurlStr!);

        const title = "Withdrawal request";
        let description = `Message from ${domain}:\n${lnObject.defaultDescription}`;
        let action: string;
        let sat: number;

        if (lnObject.minWithdrawable === lnObject.maxWithdrawable) {
          const amount = formatBitcoin(Long.fromValue(lnObject.minWithdrawable).div(1000), bitcoinUnit);
          description += `\n\nAmount: ${amount}`;

          const result = await DialogAndroid.alert(
            title,
            description,
            {
              negativeText: "Cancel",
            }
          );
          action = result.action;
          sat = Math.floor(lnObject.minWithdrawable / 1000);
        }
        else {
          const minWithdrawable = formatBitcoin(Long.fromValue(lnObject.minWithdrawable).div(1000), bitcoinUnit);
          const maxWithdrawable = formatBitcoin(Long.fromValue(lnObject.maxWithdrawable).div(1000), bitcoinUnit);
          description += `\n\nMin withdrawal amount: ${minWithdrawable}\nMax withdrawal amount: ${maxWithdrawable}`;

          const result = await DialogAndroid.prompt(
            title,
            description,
            {
              placeholder: `Amount (${BitcoinUnits[bitcoinUnit].nice})`,
              keyboardType: "numeric",
              allowEmptyInput: false,
              negativeText: "Cancel",
            }
          );

          action = result.action;
          sat = convertBitcoinUnit(Number.parseFloat(result.text), bitcoinUnit, "satoshi").toNumber();
        }

        if (action === DialogAndroid.actionPositive) {
          await doRequest(domain, sat);
        }
        else {
          navigation.pop();
        }
      }
    })();
  }, []);

  if (status !== "PROCESSING") {
    return (<></>);
  }

  return (
    <Container centered style={{ backgroundColor: blixtTheme.dark }}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Spinner color={blixtTheme.light} size={55} />
    </Container>
  );
}
