import React, { useState, useRef, Ref } from "react";
import { StyleSheet, StatusBar, Vibration } from "react-native";
import { Container, Content, View, Text, Button, Icon } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import color from "color";
import * as Animatable from "react-native-animatable";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreActions, useStoreState } from "../../state/store";
import Pincode from "../../components/Pincode";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const removePincode = useStoreActions((store) => store.security.removePincode);

  const onTryCode = async (code: string) => {
    if (await removePincode(code)) {
      setTimeout(() => navigation.pop(), 0);
      return true;
    }
    return false;
  }

  return (
    <Container>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content contentContainerStyle={style.content}>
        <Pincode onTryCode={onTryCode} textAction="Enter current pincode to remove pincode" />
        {/* <View style={style.fingerPrintSymbolContainer}>
          <Icon type="Entypo" name="fingerprint" style={style.fingerPrintSymbol} />
        </View> */}
      </Content>
    </Container>
  )
}

const style = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  fingerPrintSymbolContainer: {
    padding: 8,
    alignContent: "center",
    alignItems:"center",
    marginBottom: 16,
  },
  fingerPrintSymbol: {
    fontSize: 36
  },
});
