import React, { useEffect, useState } from "react";
import { Vibration } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import DialogAndroid from "react-native-dialogs";
import Long from "long";

import { useStoreState, useStoreActions } from "../../state/store";
import { getDomainFromURL, toast, timeout } from "../../utils";
import { ILNUrlWithdrawRequest } from "../../state/LNURL";
import { convertBitcoinUnit, formatBitcoin, BitcoinUnits } from "../../utils/bitcoin-units";
import { PLATFORM } from "../../utils/constants";
import LoadingModal from "../LoadingModal";
import { Alert } from "../../utils/alert";

interface IWithdrawRequestProps {
  navigation: StackNavigationProp<{}>;
}
export default function LNURLWithdrawRequest({ navigation }: IWithdrawRequestProps) {
  const [status, setStatus] = useState<"PROMPT" | "PROCESSING" | "DONE">("PROMPT");
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const type = useStoreState((store) => store.lnUrl.type);
  const doWithdrawRequest = useStoreActions((store) => store.lnUrl.doWithdrawRequest);
  const lnObject = useStoreState((store) => store.lnUrl.lnUrlObject) as unknown as ILNUrlWithdrawRequest;
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const syncContact = useStoreActions((store) => store.contacts.syncContact);
  const getContactByLnUrlWithdraw = useStoreState((store) => store.contacts.getContactByLnUrlWithdraw);

  const doRequest = async (domain: string, satoshi: number) => {
    try {
      setStatus("PROCESSING");
      const result = await doWithdrawRequest({ satoshi });
      setStatus("DONE");
      clear();
      if (result) {
        Vibration.vibrate(32);
        toast(
          `Sent withdrawal request to ${domain}`,
          10000,
          "success",
          "Okay"
        );
      }

      if (lnObject.balanceCheck) {
        const contact = getContactByLnUrlWithdraw(lnObject.balanceCheck);
        if (!contact) {
          Alert.alert(
            "Add to Contact List",
            `Would you like to add this withdrawal code to ${domain} to your contact list?`,
            [{
              text: "No",
            }, {
              text: "Yes",
              onPress: async () => {
                await syncContact({
                  type: "SERVICE",
                  domain,
                  lnUrlPay: lnObject.payLink ?? null,
                  lnUrlWithdraw: lnObject.balanceCheck ?? null,
                  lightningAddress: null,
                  lud16IdentifierMimeType: null,
                  note: `Account on ${domain}`,
                });
              }
            }],
          );
        } else {
          if (lnurlStr !== lnObject.balanceCheck) {
            console.log("WithdrawRequest: Syncing contact");
            await syncContact({
              ...contact,
              lnUrlWithdraw: lnObject.balanceCheck ?? null,
              note: `Synced account`,
            });
          }
        }
      }

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

        const minWithdrawable = lnObject.minWithdrawable ?? 1;
        const maxWithdrawable = lnObject.maxWithdrawable;

        if (lnObject.minWithdrawable === lnObject.maxWithdrawable) {
          const amount = formatBitcoin(Long.fromValue(lnObject.maxWithdrawable).div(1000), bitcoinUnit);
          description += `\n\nAmount: ${amount}`;
          sat = Math.floor(lnObject.minWithdrawable / 1000);

          if (PLATFORM === "android") {
            const result = await DialogAndroid.alert(
              title,
              description,
              {
                negativeText: "Cancel",
              }
            );
            action = result.action;
          } else {
            await new Promise((resolve) => {
              Alert.alert(
                title,
                description,
                [{
                  text: "Cancel",
                  onPress: () => {
                    action = DialogAndroid.actionNegative;
                    resolve();
                  },
                }, {
                  text: "OK",
                  onPress: () => {
                    action = DialogAndroid.actionPositive;
                    resolve();
                  },
                }]
              );
            });
          }
        }
        else {
          const minWithdrawableSat = formatBitcoin(Long.fromValue(minWithdrawable).div(1000), bitcoinUnit);
          const maxWithdrawableSat = formatBitcoin(Long.fromValue(maxWithdrawable).div(1000), bitcoinUnit);
          description += `\n\nMin withdrawal amount: ${minWithdrawableSat}\nMax withdrawal amount: ${maxWithdrawableSat}`;


          if (PLATFORM === "android") {
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
          } else {
            await new Promise((resolve) => {
              Alert.prompt(
                title,
                description,
                [{
                  text: "Cancel",
                  onPress: () => {
                    action = DialogAndroid.actionNegative;
                    resolve(void(0));
                  },
                }, {
                  text: "OK",
                  onPress: (text) => {
                    action = DialogAndroid.actionPositive;
                    text = text ?? "0";
                    if (bitcoinUnit === "satoshi") {
                      text = text.replace(/\[^0-9+\-\/*]/g, "");
                    }
                    else {
                      text = text.replace(/,/g, ".");
                    }
                    sat = convertBitcoinUnit(Number.parseFloat(text ?? "0"), bitcoinUnit, "satoshi").toNumber();
                    resolve(void(0));
                  },
                }],
                "plain-text",
                undefined,
                "decimal-pad"
              )
            })
          }
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
    <LoadingModal />
  );
}
