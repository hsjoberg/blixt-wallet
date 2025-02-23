import React, { useLayoutEffect, useState } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Icon, Text, Header, Item } from "native-base";
import { LegendList } from "@legendapp/list";
import { StackNavigationProp } from "@react-navigation/stack";
import Color from "color";

import { ContactsStackParamList } from "./index";
import { useStoreState, useStoreActions } from "../../state/store";
import Container from "../../components/Container";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { NavigationButton } from "../../components/NavigationButton";
import usePromptLightningAddress from "../../hooks/usePromptLightningAddress";
import { Alert } from "../../utils/alert";
import { Chain } from "../../utils/build";
import Contact from "./Contact";
import Input from "../../components/Input";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

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
  const getContactByLightningAddress = useStoreState(
    (store) => store.contacts.getContactByLightningAddress,
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t("layout.title", { ns: namespaces.contacts.contactList }),
      headerBackTitle: t("buttons.back", { ns: namespaces.common }),
      headerShown: true,
      headerRight: () => {
        return (
          <NavigationButton onPress={addLightningAddress}>
            <Icon type="AntDesign" name="adduser" style={{ fontSize: 22 }} />
          </NavigationButton>
        );
      },
    });
    getContacts();
  }, [navigation]);

  const addLightningAddress = async () => {
    const [result, lightningAddress] = await promptLightningAddress();
    if (result && lightningAddress) {
      if (getContactByLightningAddress(lightningAddress)) {
        Alert.alert("", `${lightningAddress} ${t("lightningAddressAlreadyExists")}.`);
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
        label: null,
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

  let sortedContacts = filteredContacts.sort((a, b) => {
    const aCmp = a.lightningAddress ?? a.domain;
    const bCmp = b.lightningAddress ?? b.domain;

    if (aCmp < bCmp) {
      return -1;
    }
    if (aCmp > bCmp) {
      return 1;
    }
    return 0;
  });

  return (
    <Container>
      <Header iosBarStyle="light-content" searchBar rounded style={style.searchHeader}>
        <Item rounded style={{ height: 35 }}>
          <Input
            style={{ marginLeft: 8, marginTop: -2.5, borderRadius: 8, color: blixtTheme.dark }}
            placeholder={t("generic.search", { ns: namespaces.common })}
            onChangeText={setSearchText}
            autoCorrect={false}
            enableFocusRing={false} // macOS prop
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
      <LegendList
        alwaysBounceVertical={false}
        contentContainerStyle={{ padding: 14 }}
        estimatedItemSize={72}
        data={sortedContacts}
        renderItem={({ item: contact }) => <Contact contact={contact} />}
        keyExtractor={(item) => item.id!.toString()}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            {t("layout.nothingHereYet") + "\n\n" + t("layout.whyNotAdd") + "\n"}
            <Text onPress={addLightningAddress} style={{ color: blixtTheme.link }}>
              {t("layout.tappingHere")}
            </Text>
            ?
          </Text>
        }
      />
    </Container>
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
});
