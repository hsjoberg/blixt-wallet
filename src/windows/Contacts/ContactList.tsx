import React, { useEffect, useLayoutEffect, useState } from "react";
import { StyleSheet, View, LayoutAnimation, Pressable, StatusBar, EmitterSubscription, Image } from "react-native";
import { Icon, Card, CardItem, Text, Button, Header, Item, Input } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/core";
import Long from "long";
import Color from "color";

import { ContactsStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import Container from "../../components/Container";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { formatBitcoin, valueFiat } from "../../utils/bitcoin-units";
import { NavigationButton } from "../../components/NavigationButton";
import Content from "../../components/Content";
import TextLink from "../../components/TextLink";
import usePromptLightningAddress from "../../hooks/usePromptLightningAddress";
import { toast } from "../../utils";
import { IContact } from "../../storage/database/contact";
import { Alert } from "../../utils/alert";
import { ILNUrlWithdrawRequest } from "../../state/LNURL";
import ButtonSpinner from "../../components/ButtonSpinner";
import { LndMobileEventEmitter } from "../../utils/event-listener";
import { decodeInvoiceResult } from "../../lndmobile/wallet";
import { lnrpc } from "../../../proto/lightning";
import { Chain } from "../../utils/build";
import { checkLndStreamErrorResponse } from "../../utils/lndmobile";
import { fontFactorNormalized } from "../../utils/scale";

import { useTranslation, TFunction } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IContactProps {
  contact: IContact;
}
function Contact({ contact }: IContactProps) {
  const t = useTranslation(namespaces.contacts.contactList).t;
  const navigation = useNavigation();
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

  useEffect(() => {
    let listener: EmitterSubscription | null = null;

    if (contact.lnUrlWithdraw && !currentBalance) {
      console.log("Subscribing to invoice inside Contact " + contact.domain + " " + contact.note);
      listener = LndMobileEventEmitter.addListener("SubscribeInvoices", async (e: any) => {
        try {
          console.log("Contact component: SubscribeInvoices");
          const error = checkLndStreamErrorResponse("SubscribeInvoices", e);
          if (error === "EOF") {
            return;
          } else if (error) {
            console.log("ContactList: Got error from SubscribeInvoices", [error]);
            throw error;
          }

          const invoice = decodeInvoiceResult(e.data);
          if (invoice.state === lnrpc.Invoice.InvoiceState.SETTLED) {
            console.log("Contact: An invoice was settled, querying balance");
            console.log("Syncing from subscription");
            await syncBalance();
          }
        } catch (e) {
          console.log("From Contact component" + e);
        }
      });
    }
    return () => {
      listener?.remove();
    }
  }, [currentBalance !== undefined]);

  const toggle = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpand(!expand);

    if (contact.lnUrlWithdraw) {
      await syncBalance();
    }
  };

  const syncBalance = async () => {
    try {
      if (contact.lnUrlWithdraw) {
        const balanceCheckResponse = await fetch(contact.lnUrlWithdraw);
        const lnurlObject = await balanceCheckResponse.json() as ILNUrlWithdrawRequest;
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
    } catch (error:any) {
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
              }
            },
          });
          setTimeout(() => setLoadingPay(false), 1);
        } else {
          if (result === "error") {
            throw new Error(t("contact.send.error1"));
          }
          throw new Error(`${t("contact.send.error2")} (${t("contact.got")} ${result})`)
        }
      } else {
        throw new Error(t("contact.send.error3"));
      }
    } catch (error:any) {
      setLoadingPay(false);
      toast(error.message, 0, "danger", "OK");
    }
  }

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
            throw new Error(t("contact.withdraw.error1"));
          }
          throw new Error(`${t("contact.withdraw.error2")} (${t("contact.got")} ${result})`)
        }
      } else {
        throw new Error(t("contact.withdraw.error3"));
      }
    } catch (error:any) {
      setLoadingWithdraw(false);
      toast(error.message, 0, "danger", "OK");
    }
  }

  const promptDeleteContact = async () => {
    Alert.alert(
      t("contact.deleteContact.dialog.title"),
      `${t("contact.deleteContact.dialog.msg")} ${contact.lightningAddress ?? contact.domain}?`,
      [{
        text: t("buttons.no",{ns:namespaces.common}),
      }, {
        text: t("buttons.yes",{ns:namespaces.common}),
        onPress: async () => {
          await deleteContact(contact.id!);
        }
      }],
    );
  };

  return (
    <>
      <Card style={style.card}>
        <CardItem style={style.cardItem} activeOpacity={1} button>
          <Pressable style={style.cardPressable} onPress={toggle}>
            <View style={style.cardSimple}>
              <Icon style={style.cardIcon} type="MaterialCommunityIcons" name={contact.type === "SERVICE" ? "web" : "at"} />
              <Text style={style.cardTitle} numberOfLines={1} lineBreakMode="middle">
                {contact.type === "SERVICE" && (
                  <>
                    {contact.lnUrlPay && !contact.lnUrlWithdraw &&
                      <>{t("contact.list.pay")} <TextLink url={`https://${contact.domain}`}>{contact.domain}</TextLink></>
                    }
                    {!contact.lnUrlPay && contact.lnUrlWithdraw &&
                      <>{t("contact.list.account")} <TextLink url={`https://${contact.domain}`}>{contact.domain}</TextLink></>
                    }
                    {contact.lnUrlPay && contact.lnUrlWithdraw &&
                      <>{t("contact.list.account")} <TextLink url={`https://${contact.domain}`}>{contact.domain}</TextLink></>
                    }
                  </>
                )}
                {contact.type === "PERSON" &&
                  <>{contact.lightningAddress}</>
                }
              </Text>
              <View style={style.expandContainer}>
                <Icon type="AntDesign" name={expand ? "minus" : "plus"}/>
              </View>
            </View>
          </Pressable>
          <View style={[{height: expand ? "auto" : 0}, style.cardExpansionContainer]}>
            <View style={style.cardExpansion}>
              <View style={style.cardExpansionInfo}>
                {contact.note.length > 0 && <Text>{contact.note}</Text>}
                {contact.lnUrlWithdraw &&
                  <Text>
                    {t("contact.syncBalance.title")}:{" "}
                    {currentBalance && (
                      <>
                        {formatBitcoin(Long.fromValue(currentBalance).div(1000), bitcoinUnit)}{" "}
                        ({valueFiat(Long.fromValue(currentBalance).div(1000), fiatRate).toFixed(2) + " " + fiatUnit})
                      </>
                    )}
                    {!currentBalance && <>...</>}
                  </Text>
                }
              </View>
              <View style={style.actionButtons}>
                {contact.lnUrlWithdraw &&
                  <Button onPress={onPressWithdraw} style={[style.actionButton, { width: 90 }]} small disabled={loadingWithdraw}>
                    {!loadingWithdraw && <Text style={style.actionButtonText}>{t("contact.withdraw.title")}</Text>}
                    {loadingWithdraw && <ButtonSpinner />}
                  </Button>
                }
                {(contact.lnUrlPay || contact.lightningAddress) &&
                <>
                  <Button onPress={onPressSend} style={[style.actionButton, { width: 60 }]} small disabled={loadingPay}>
                    {!loadingPay && <Text style={style.actionButtonText}>{t("contact.send.title")}</Text>}
                    {loadingPay && <ButtonSpinner />}
                  </Button>
                </>
                }

                <View style={style.actionButtonsAdmin}>
                  <Button onPress={promptDeleteContact} small style={[style.actionButton]} icon danger>
                    <Icon type="AntDesign" name="delete" style={[style.actionButton, {fontSize: 10, margin: 0, padding: 0 }]}/>
                  </Button>
                  {/* <Button small style={[style.actionButton, {  }]} icon warning>
                    <Icon type="AntDesign" name="edit" style={[style.actionButton, {fontSize: 14 }]} />
                  </Button> */}
                </View>
              </View>
            </View>
          </View>
        </CardItem>
      </Card>
    </>
  );
}

interface IContactListProps {
  navigation: StackNavigationProp<ContactsStackParamList, "ContactList">;
}
export default function ContactList({ navigation }: IContactListProps) {
  const t = useTranslation(namespaces.contacts.contactList).t;
  const [searchText, setSearchText] = useState("");
  const contacts = useStoreState((store) => store.contacts.contacts);
  const getContacts = useStoreActions((store) => store.contacts.getContacts);
  const syncContact = useStoreActions((store) => store.contacts.syncContact);
  const clearLnUrl = useStoreActions((store) => store.lnUrl.clear);
  const promptLightningAddress = usePromptLightningAddress();
  const getContactByLightningAddress = useStoreState((store) => store.contacts.getContactByLightningAddress);

  const headerTitle = t("layout.title",{ns:namespaces.contacts.contactList});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: headerTitle,
      headerBackTitle: t("buttons.back",{ns:namespaces.common}),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={addLightningAddress}>
            <Icon type="AntDesign" name="adduser" style={{ fontSize: 22 }} />
          </NavigationButton>
        )
      }
    });
    getContacts();
  }, [navigation]);

  const addLightningAddress = async () => {
    const [result, lightningAddress] = await promptLightningAddress();
    if (result && lightningAddress) {
      if (getContactByLightningAddress(lightningAddress)) {
        Alert.alert("", `${lightningAddress} ${t("layout.addLightningAddress.alert")}.`);
        return;
      }

      const domain = lightningAddress.split("@")[1] ?? "";
      await syncContact({
        type: "PERSON",
        domain,
        lnUrlPay: null,
        lnUrlWithdraw: null,
        lightningAddress: lightningAddress!,
        lud16IdentifierMimeType: "text/identifier",
        note: "",
      });
    }
    clearLnUrl();
  };

  const filteredContacts = contacts.filter((contact) => {
    if (searchText.length > 0) {
      const search = searchText.toUpperCase();
      return (
        contact.lightningAddress?.toUpperCase().includes(search) ||
        contact.domain.toUpperCase().includes(search) ||
        contact.note.toUpperCase().includes(search)
      );
    }
    return true;
  });

  const sortedContacts = filteredContacts.sort((a, b) => {
    const aCmp = a.lightningAddress ?? a.domain;
    const bCmp = b.lightningAddress ?? b.domain

    if (aCmp < bCmp) {
      return -1;
    }
    if (aCmp > bCmp) {
      return 1;
    }
    return 0;
  })

  return (
    <Container>
      <Header iosBarStyle="light-content" searchBar rounded style={style.searchHeader}>
        <Item rounded style={{ height:35 }}>
          <Input
            style={{ marginLeft: 8, marginTop: -2.5, borderRadius: 8, color: blixtTheme.dark }}
            placeholder="Search"
            onChangeText={setSearchText}
            autoCorrect={false}
          />
          <Icon name="ios-search" />
        </Item>
      </Header>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={false}
        translucent={true}
      />
      <Content>
        {contacts.length === 0 &&
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            {t("layout.msg")+"\n\n"+t("layout.msg")+"\n"}
            <Text onPress={addLightningAddress} style={{color:blixtTheme.link}}>${t("layout.addLightningAddress.alert")}</Text>?
          </Text>
        }
        {sortedContacts.map((contact) => (
          <Contact key={contact.id} contact={contact} />
        ))}
      </Content>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 25,
  },
  searchHeader: {
    backgroundColor: Chain === "mainnet" ? blixtTheme.primary : Color(blixtTheme.lightGray).darken(0.30).hex(),
    paddingTop: 0,
    borderBottomWidth: 0,
    marginHorizontal: 8,
    elevation: 0,
  },
  card: {
  },
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
    alignItems:"center"
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
    fontSize: 10  * fontFactorNormalized,
  },
  balanceInfo: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 24,
  },
  spendableAmount: {
    textAlign: "center",
  },
  fab: {
    backgroundColor: blixtTheme.primary,
  },
  fabNewChannelIcon: {
    color: blixtTheme.light,
  },
});
