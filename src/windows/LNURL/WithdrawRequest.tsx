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

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IWithdrawRequestProps {
  navigation: StackNavigationProp<{}>;
}
export default function LNURLWithdrawRequest({ navigation }: IWithdrawRequestProps) {
  const t = useTranslation(namespaces.LNURL.withdrawRequest).t;
  const [status, setStatus] = useState<"PROMPT" | "PROCESSING" | "DONE">("PROMPT");
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const type = useStoreState((store) => store.lnUrl.type);
  const doWithdrawRequest = useStoreActions((store) => store.lnUrl.doWithdrawRequest);
  const lnObject = useStoreState(
    (store) => store.lnUrl.lnUrlObject,
  ) as unknown as ILNUrlWithdrawRequest;
  const clear = useStoreActions((store) => store.lnUrl.clear);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const syncContact = useStoreActions((store) => store.contacts.syncContact);
  const getContactByLnUrlWithdraw = useStoreState(
    (store) => store.contacts.getContactByLnUrlWithdraw,
  );

  const doRequest = async (domain: string, satoshi: number) => {
    try {
      setStatus("PROCESSING");
      const result = await doWithdrawRequest({ satoshi });
      setStatus("DONE");
      clear();
      if (result) {
        Vibration.vibrate(32);
        toast(t("doRequest.sentRequest", { domain }), 10000, "success", "Okay");
      }

      if (lnObject.balanceCheck) {
        const contact = getContactByLnUrlWithdraw(lnObject.balanceCheck);
        if (!contact) {
          Alert.alert(
            t("doRequest.addToContactList.title"),
            `${t("doRequest.addToContactList.msg", { domain })}`,
            [
              {
                text: t("buttons.no", { ns: namespaces.common }),
              },
              {
                text: t("buttons.yes", { ns: namespaces.common }),
                onPress: async () => {
                  await syncContact({
                    type: "SERVICE",
                    domain,
                    lnUrlPay: lnObject.payLink ?? null,
                    lnUrlWithdraw: lnObject.balanceCheck ?? null,
                    lightningAddress: null,
                    lud16IdentifierMimeType: null,
                    note: t("doRequest.addToContactList.note", { domain }),
                    label: null,
                  });
                },
              },
            ],
          );
        } else {
          if (lnurlStr !== lnObject.balanceCheck) {
            console.log("WithdrawRequest: Syncing contact");
            await syncContact({
              ...contact,
              lnUrlWithdraw: lnObject.balanceCheck ?? null,
            });
          }
        }
      }

      navigation.pop();
    } catch (e: any) {
      console.log(e);
      setStatus("DONE");
      clear();
      Vibration.vibrate(50);
      toast(t("msg.error", { ns: namespaces.common }) + ": " + e.message, 12000, "warning", "Okay");
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

        const title = t("layout.title");
        let description = `${t("layout.msg")} ${domain}:\n${lnObject.defaultDescription}`;
        let action: string;
        let sat: number;

        const minWithdrawable = lnObject.minWithdrawable ?? 1;
        const maxWithdrawable = lnObject.maxWithdrawable;

        if (lnObject.minWithdrawable === lnObject.maxWithdrawable) {
          const amount = formatBitcoin(BigInt(lnObject.maxWithdrawable / 1000), bitcoinUnit);
          description += `\n\n${t("layout.dialog.msg")}: ${amount}`;
          sat = Math.floor(lnObject.minWithdrawable / 1000);

          if (PLATFORM === "android") {
            const result = await DialogAndroid.alert(title, description, {
              negativeText: t("buttons.cancel", { ns: namespaces.common }),
            });
            action = result.action;
          } else {
            await new Promise((resolve) => {
              Alert.alert(title, description, [
                {
                  text: t("buttons.cancel", { ns: namespaces.common }),
                  onPress: () => {
                    action = DialogAndroid.actionNegative;
                    resolve(null);
                  },
                },
                {
                  text: t("buttons.ok", { ns: namespaces.common }),
                  onPress: () => {
                    action = DialogAndroid.actionPositive;
                    resolve(null);
                  },
                },
              ]);
            });
          }
        } else {
          const minWithdrawableSat = formatBitcoin(BigInt(minWithdrawable / 1000), bitcoinUnit);
          const maxWithdrawableSat = formatBitcoin(BigInt(maxWithdrawable / 1000), bitcoinUnit);
          description += `\n\n${t("layout.dialog1.minSat")}: ${minWithdrawableSat}\n${t("layout.dialog1.maxSat")}: ${maxWithdrawableSat}`;

          if (PLATFORM === "android") {
            const result = await DialogAndroid.prompt(title, description, {
              placeholder: `${t("layout.dialog1.placeholder")} (${BitcoinUnits[bitcoinUnit].nice})`,
              keyboardType: "numeric",
              allowEmptyInput: false,
              negativeText: t("buttons.cancel", { ns: namespaces.common }),
            });

            action = result.action;
            sat = convertBitcoinUnit(
              Number.parseFloat(result.text),
              bitcoinUnit,
              "satoshi",
            ).toNumber();
          } else {
            await new Promise((resolve) => {
              Alert.prompt(
                title,
                description,
                [
                  {
                    text: t("buttons.cancel", { ns: namespaces.common }),
                    onPress: () => {
                      action = DialogAndroid.actionNegative;
                      resolve(void 0);
                    },
                  },
                  {
                    text: t("buttons.ok", { ns: namespaces.common }),
                    onPress: (text) => {
                      action = DialogAndroid.actionPositive;
                      text = text ?? "0";
                      if (bitcoinUnit === "satoshi") {
                        text = text.replace(/\[^0-9+\-\/*]/g, "");
                      } else {
                        text = text.replace(/,/g, ".");
                      }
                      sat = convertBitcoinUnit(
                        Number.parseFloat(text ?? "0"),
                        bitcoinUnit,
                        "satoshi",
                      ).toNumber();
                      resolve(void 0);
                    },
                  },
                ],
                "plain-text",
                undefined,
                "decimal-pad",
              );
            });
          }
        }

        if (action === DialogAndroid.actionPositive) {
          await doRequest(domain, sat);
        } else {
          navigation.pop();
        }
      }
    })();
  }, []);

  if (status !== "PROCESSING") {
    return <></>;
  }

  return <LoadingModal />;
}
