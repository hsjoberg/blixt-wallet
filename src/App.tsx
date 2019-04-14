import React, { Component, useState, useRef } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Container, Content, Footer, FooterTab, Icon, Item, Label, Text, StyleProvider } from "native-base";

import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";

import getTheme from "../native-base-theme/components";
import material from "../native-base-theme/variables/material";

const svga = QRCode.toString("lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w".toUpperCase());
//console.log(svga._55.length);
const svgb = QRCode.toString("lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w");
//console.log(svgb._55.length);

export default () => {
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  return (
    <StyleProvider style={getTheme(material)}>
      <Container style={styles.container}>
        <Modal
          animationType="fade"
          transparent={false}
          visible={receiveModalVisible}
          onRequestClose={() => {
            setReceiveModalVisible(false);
          }}>
          <Receive onGoBackCallback={() => setReceiveModalVisible(false)} />
        </Modal>

        <Modal
          animationType="fade"
          transparent={false}
          visible={sendModalVisible}
          onRequestClose={() => {
            setSendModalVisible(false);
          }}>
          <Send onGoBackCallback={() => setSendModalVisible(false)} doneCallback={() => {}} />
        </Modal>

        <Modal
          animationType="fade"
          transparent={false}
          visible={settingsModalVisible}
          onRequestClose={() => {
            setSettingsModalVisible(false);
          }}>
          <Settings onGoBackCallback={() => setSettingsModalVisible(false)} />
        </Modal>

        <Overview onSettingsClick={() => setSettingsModalVisible(true)} />

        <FooterNav
          onSendButtonClicked={() => setSendModalVisible(true)}
          onReceiveButtonClicked={() => setReceiveModalVisible(true)}
        />
      </Container>
    </StyleProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    flexGrow: 1,
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
