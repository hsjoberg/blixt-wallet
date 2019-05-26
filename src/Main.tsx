import React from "react";
import { Modal, StyleSheet, View } from "react-native";

import { useActions, useStore } from "./state/store";
import { EModalWindow } from "./state/Modal";

import Loader from "./Loader";
import FooterNav from "./components/FooterNav";
import Overview from "./windows/Overview";
import Send from "./windows/Send";
import Receive from "./windows/Receive";
import Settings from "./windows/Settings";
import LightningInfo from "./windows/LightningInfo";

interface IModals {
  key: EModalWindow;
  component: any;
  doneCallback: () => void;
}

export default () => {
  const activeModal = useStore((state) => state.modal.active);
  const setActiveModal = useActions((actions) => actions.modal.setActiveModal);
  const nodeInfo = useStore((store) => store.lightning.nodeInfo);
  const getBalance = useActions((actions) => actions.lightning.getBalance);

  if (!nodeInfo) {
    return (<Loader />);
  }

  const modals: IModals[] = [{
      key: EModalWindow.Receive,
      component: Receive,
      doneCallback() {},
    }, {
      key: EModalWindow.Send,
      component: Send,
      async doneCallback() {
        setActiveModal(null);
        await getBalance();
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
          children={
            <component.component
              onGoBackCallback={() => setActiveModal(null)}
              doneCallback={() => { console.log("Done"); component.doneCallback(); }}
            />
          }
          animationType="fade" transparent={false}
          visible={activeModal === component.key}
          onRequestClose={() => setActiveModal(null)}
        />
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
