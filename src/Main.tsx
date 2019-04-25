import React, { Component, useState, useRef } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Container, Content, Footer, FooterTab, Icon, Item, Label, Text, StyleProvider, Button } from "native-base";

import { useActions, useStore } from "./store";
import { IModalModel } from "./model/Modal";

import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";

import getTheme from "../native-base-theme/components";
import theme from "../native-base-theme/variables/commonColor";

const Test = () => {
  const active = useStore((state) => state.modal.active);
  const setActiveModal = useActions((actions) => actions.modal.setActiveModal);
  return (
    <View>
      <Text>{active}</Text>
      <Button onPress={() => setActiveModal("settings")}><Text>Test</Text></Button>
    </View>
  );
};

interface IModals {
  key: IModalModel["active"];
  component: any;
  doneCallback: () => void;
}

const modals: IModals[] = [{
    key: "receive",
    component: Receive,
    doneCallback() {},
  }, {
    key: "send",
    component: Send,
    doneCallback() {},
  }, {
    key: "settings",
    component: Settings,
    doneCallback() {},
  }, {
    key: "lightning_info",
    component: LightningInfo,
    doneCallback() {},
  },
];

export default () => {
  const activeModal = useStore((state) => state.modal.active);
  const setActiveModal = useActions((actions) => actions.modal.setActiveModal);

  return (
    <View style={styles.container}>
      {modals.map((component, key) => (
          <Modal
            key={key}
            animationType="fade"
            transparent={false}
            visible={activeModal === component.key}
            onRequestClose={() => setActiveModal(null)}
          >
            <component.component
              onGoBackCallback={() => setActiveModal(null)}
              doneCallback={() => { console.log("Done"); component.doneCallback(); }}
            />
          </Modal>
      ))}

      <Overview />

      <FooterNav
        onSendButtonClicked={() => setActiveModal("send")}
        onReceiveButtonClicked={() => setActiveModal("receive")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
  welcome: {
    fontSize: 20,
    textAlign: "center",
    margin: 10,
  },
  button: {
    textAlign: "center",
  },
});
