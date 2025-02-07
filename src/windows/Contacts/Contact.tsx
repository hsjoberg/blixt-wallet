import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Icon, Card, CardItem, Text, Button } from "native-base";
import { useNavigation, NavigationProp } from "@react-navigation/core";
import Color from "color";

import { useStoreState, useStoreActions } from "../../state/store";
import { formatBitcoin, valueFiat } from "../../utils/bitcoin-units";
import TextLink from "../../components/TextLink";
import { toast } from "../../utils";
import { IContact } from "../../storage/database/contact";
import { Alert } from "../../utils/alert";
import { ILNUrlWithdrawRequest } from "../../state/LNURL";
import ButtonSpinner from "../../components/ButtonSpinner";
import { Chain } from "../../utils/build";
import { fontFactorNormalized } from "../../utils/scale";
import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { NavigationRootStackParamList } from "../../types";

import { subscribeInvoices } from "react-native-turbo-lnd";
import { Invoice_InvoiceState } from "react-native-turbo-lnd/protos/lightning_pb";
import { UnsubscribeFromStream } from "react-native-turbo-lnd/core";

interface IContactProps {
  contact: IContact;
}

export default function Contact({ contact }: IContactProps) {
  const t = useTranslation(namespaces.contacts.contactList).t;
  const navigation = useNavigation<NavigationProp<NavigationRootStackParamList>>();

  const setLNUrl = useStoreActions((store) => store.lnUrl.setLNUrl);
  const resolveLightningAddress = useStoreActions((store) => store.lnUrl.resolveLightningAddress);
  const deleteContact = useStoreActions((store) => store.contacts.deleteContact);
  const [expand, setExpand] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number | undefined>();
  const syncContact = useStoreActions((store) => store.contacts.syncContact);
  const bitcoinUnit = useStoreState((store) => store.settings.bitcoinUnit);
  const fiatRate = useStoreState((store) => store.fiat.currentRate);
  const fiatUnit = useStoreState((store) => store.settings.fiatUnit);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [sendButtonWidth, setSendButtonWidth] = useState<number | undefined>();
  const [widthdrawButtonWidth, setWithdrawButtonWidth] = useState<number | undefined>();

  useEffect(() => {
    let listener: UnsubscribeFromStream;

    if (contact.lnUrlWithdraw && !currentBalance) {
      listener = subscribeInvoices(
        {},
        async (invoice) => {
          if (invoice.state === Invoice_InvoiceState.SETTLED) {
            console.log("Contact: An invoice was settled, querying balance");
            console.log("Syncing from subscription");
            await syncBalance();
          }
        },
        (err) => {
          console.log("From Contact component" + err);
        },
      );
      console.log("Subscribing to invoice inside Contact " + contact.domain + " " + contact.note);
    }
    return () => {
      if (listener) {
        listener();
      }
    };
  }, [currentBalance !== undefined]);

  const toggle = async () => {
    setExpand(!expand);

    if (contact.lnUrlWithdraw) {
      await syncBalance();
    }
  };

  const syncBalance = async () => {
    try {
      if (contact.lnUrlWithdraw) {
        const balanceCheckResponse = await fetch(contact.lnUrlWithdraw);
        const lnurlObject = (await balanceCheckResponse.json()) as ILNUrlWithdrawRequest;
        console.log(lnurlObject, contact.lnUrlWithdraw);
        const currBalance = lnurlObject.currentBalance ?? lnurlObject.maxWithdrawable;
        if (typeof currBalance === "number") {
          setCurrentBalance(currBalance);

          if (lnurlObject.balanceCheck !== contact.lnUrlWithdraw) {
            await syncContact({
              ...contact,
              lnUrlWithdraw: lnurlObject.balanceCheck ?? null,
            });
          }
        }
      } else {
        throw new Error(t("contact.syncBalance.error"));
      }
    } catch (error: any) {
      toast(error.message, 0, "danger", "OK");
    }
  };

  const onPressSend = async () => {
    try {
      setLoadingPay(true);
      if (contact.lightningAddress) {
        if (await resolveLightningAddress(contact.lightningAddress)) {
          navigation.navigate("LNURL", {
            screen: "PayRequest",
            params: {
              callback: async () => {
                if (contact.lnUrlWithdraw) {
                  await syncBalance();
                }
              },
            },
          });
          setTimeout(() => setLoadingPay(false), 1);
        }
      } else if (contact.lnUrlPay) {
        const result = await setLNUrl({
          url: contact.lnUrlPay,
        });
        if (result === "payRequest") {
          navigation.navigate("LNURL", {
            screen: "PayRequest",
            params: {
              callback: async () => {
                if (contact.lnUrlWithdraw) {
                  await syncBalance();
                }
              },
            },
          });
          setTimeout(() => setLoadingPay(false), 1);
        } else {
          if (result === "error") {
            throw new Error(t("contact.send.couldNotPay"));
          }
          throw new Error(`${t("contact.send.invalidResponse", { response: result })}`);
        }
      } else {
        throw new Error(t("contact.send.invalidOperation"));
      }
    } catch (error: any) {
      setLoadingPay(false);
      toast(error.message, 0, "danger", "OK");
    }
  };

  const onPressWithdraw = async () => {
    try {
      setLoadingWithdraw(true);
      if (contact.lnUrlWithdraw) {
        const result = await setLNUrl({
          url: contact.lnUrlWithdraw,
        });
        if (result === "withdrawRequest") {
          navigation.navigate("LNURL", { screen: "WithdrawRequest" });
          setLoadingWithdraw(false);
        } else {
          if (result === "error") {
            throw new Error(t("contact.withdraw.couldNotPay"));
          }
          throw new Error(`${t("contact.withdraw.invalidResponse", { response: result })})`);
        }
      } else {
        throw new Error(t("contact.withdraw.invalidOperation"));
      }
    } catch (error: any) {
      setLoadingWithdraw(false);
      toast(error.message, 0, "danger", "OK");
    }
  };

  const promptDeleteContact = async () => {
    Alert.alert(
      t("contact.deleteContact.title"),
      `${t("contact.deleteContact.msg", { contact: contact.lightningAddress ?? contact.domain })}`,
      [
        {
          text: t("buttons.no", { ns: namespaces.common }),
        },
        {
          text: t("buttons.yes", { ns: namespaces.common }),
          onPress: async () => {
            await deleteContact(contact.id!);
          },
        },
      ],
    );
  };

  const editContact = async () => {
    Alert.prompt(
      t("contact.editContactLabel.title"),
      undefined,
      (text) => {
        syncContact({
          ...contact,
          label: text || null,
        });
      },
      undefined,
      contact.label ?? undefined,
    );
  };

  return (
    <>
      <Card style={style.card}>
        <CardItem style={style.cardItem} activeOpacity={1} button>
          <Pressable style={style.cardPressable} onPress={toggle}>
            <View style={style.cardSimple}>
              <Icon
                style={style.cardIcon}
                type="MaterialCommunityIcons"
                name={contact.type === "SERVICE" ? "web" : "at"}
              />
              <Text
                style={[style.cardTitle, contact.label ? { fontSize: 11 } : null]}
                numberOfLines={1}
                lineBreakMode="middle"
              >
                {contact.type === "SERVICE" && (
                  <>
                    {contact.lnUrlPay && !contact.lnUrlWithdraw && (
                      <>
                        {t("contact.list.pay")}{" "}
                        <TextLink url={`https://${contact.domain}`}>{contact.domain}</TextLink>
                      </>
                    )}
                    {!contact.lnUrlPay && contact.lnUrlWithdraw && (
                      <>
                        {t("contact.list.account")}{" "}
                        <TextLink url={`https://${contact.domain}`}>{contact.domain}</TextLink>
                      </>
                    )}
                    {contact.lnUrlPay && contact.lnUrlWithdraw && (
                      <>
                        {t("contact.list.account")}{" "}
                        <TextLink url={`https://${contact.domain}`}>{contact.domain}</TextLink>
                      </>
                    )}
                  </>
                )}
                {contact.type === "PERSON" && <>{contact.lightningAddress}</>}
                {contact.label && ` (${contact.label})`}
              </Text>
              <View style={style.expandContainer}>
                <Icon type="AntDesign" name={expand ? "minus" : "plus"} />
              </View>
            </View>
          </Pressable>
          <View style={[{ height: expand ? "auto" : 0 }, style.cardExpansionContainer]}>
            <View style={style.cardExpansion}>
              <View style={style.cardExpansionInfo}>
                {contact.note.length > 0 && <Text>{contact.note}</Text>}
                {contact.lnUrlWithdraw && (
                  <Text>
                    {t("contact.syncBalance.title")}:{" "}
                    {currentBalance && (
                      <>
                        {formatBitcoin(BigInt(currentBalance / 10000), bitcoinUnit)} (
                        {valueFiat(BigInt(currentBalance / 1000), fiatRate).toFixed(2) +
                          " " +
                          fiatUnit}
                        )
                      </>
                    )}
                    {currentBalance === undefined && <>...</>}
                  </Text>
                )}
              </View>
              <View style={style.actionButtons}>
                {contact.lnUrlWithdraw && currentBalance! > 0 && (
                  <Button
                    onPress={onPressWithdraw}
                    style={[style.actionButton, { width: widthdrawButtonWidth }]}
                    small
                    disabled={loadingWithdraw}
                    onLayout={(event) => {
                      if (!sendButtonWidth) {
                        setWithdrawButtonWidth(event.nativeEvent.layout.width);
                      }
                    }}
                  >
                    {!loadingWithdraw && (
                      <Text style={style.actionButtonText}>{t("contact.withdraw.title")}</Text>
                    )}
                    {loadingWithdraw && <ButtonSpinner />}
                  </Button>
                )}
                {(contact.lnUrlPay || contact.lightningAddress) && (
                  <>
                    <Button
                      onPress={onPressSend}
                      style={[style.actionButton, { width: sendButtonWidth }]}
                      small
                      disabled={loadingPay}
                      onLayout={(event) => {
                        if (!sendButtonWidth) {
                          setSendButtonWidth(event.nativeEvent.layout.width);
                        }
                      }}
                    >
                      {!loadingPay && (
                        <Text style={style.actionButtonText}>{t("contact.send.title")}</Text>
                      )}
                      {loadingPay && <ButtonSpinner />}
                    </Button>
                  </>
                )}

                <View style={style.actionButtonsAdmin}>
                  <Button
                    onPress={promptDeleteContact}
                    small
                    style={[style.actionButton]}
                    icon
                    danger
                  >
                    <Icon
                      type="AntDesign"
                      name="delete"
                      style={[style.actionButton, { fontSize: 10 }]}
                    />
                  </Button>
                  <Button onPress={editContact} small style={[style.actionButton]} icon>
                    <Icon
                      type="AntDesign"
                      name="edit"
                      style={[style.actionButton, { fontSize: 10 }]}
                    />
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </CardItem>
      </Card>
    </>
  );
}

const style = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 25,
  },
  searchHeader: {
    backgroundColor:
      Chain === "mainnet" ? blixtTheme.primary : Color(blixtTheme.lightGray).darken(0.3).hex(),
    paddingTop: 0,
    borderBottomWidth: 0,
    marginHorizontal: 8,
    elevation: 0,
  },
  card: {},
  cardItem: {
    flexDirection: "column",
  },
  cardPressable: {
    flex: 1,
    width: "100%",
    marginVertical: -10,
    paddingVertical: 15,
  },
  cardSimple: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    padding: 0,
  },
  cardTitle: {
    width: 220,
    fontSize: 13,
    marginLeft: 2,
  },
  expandContainer: {
    flexGrow: 1,
    flexDirection: "row-reverse",
  },
  cardExpansionContainer: {
    width: "100%",
    overflow: "hidden",
  },
  cardExpansion: {
    flex: 1,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: "column",
    overflow: "hidden",
  },
  cardExpansionInfo: {
    flex: 1,
    marginBottom: 15,
    overflow: "hidden",
  },
  actionButtons: {
    flexDirection: "row",
    overflow: "hidden",
  },
  actionButtonsAdmin: {
    flexGrow: 1,
    flexDirection: "row-reverse",
    overflow: "hidden",
  },
  actionButton: {
    margin: 2,
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 10 * fontFactorNormalized,
  },
});
