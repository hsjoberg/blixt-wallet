import React, { Component, useState, useRef } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Container, Content, Footer, FooterTab, Icon, Item, Label, Text, StyleProvider, Button } from "native-base";

import { useActions, useStore } from "./store";
import { IModalModel, EModalWindow } from "./model/Modal";

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
      <Button onPress={() => setActiveModal(EModalWindow.Settings)}><Text>Test</Text></Button>
    </View>
  );
};

interface IModals {
  key: EModalWindow; // IModalModel["active"];
  component: any;
  doneCallback: () => void;
}

export default () => {
  const activeModal = useStore((state) => state.modal.active);
  const setActiveModal = useActions((actions) => actions.modal.setActiveModal);

  const modals: IModals[] = [{
      key: EModalWindow.Receive,
      component: Receive,
      doneCallback() {},
    }, {
      key: EModalWindow.Send,
      component: Send,
      doneCallback() {
        setActiveModal(null);
      },
    }, {
      key: EModalWindow.Settings,
      component: Settings,
      doneCallback() {},
    }, {
      key: EModalWindow.LightningInfo,
      component: LightningInfo,
      doneCallback() {},
    },
  ];

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
        onSendButtonClicked={() => setActiveModal(EModalWindow.Send)}
        onReceiveButtonClicked={() => setActiveModal(EModalWindow.Receive)}
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
