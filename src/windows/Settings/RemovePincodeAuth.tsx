import React from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Container, Content } from "native-base";
import { useNavigation } from "@react-navigation/native";

import { useStoreActions } from "../../state/store";
import Pincode from "../../components/Pincode";

export default () => {
  const navigation = useNavigation();
  const removePincode = useStoreActions((store) => store.security.removePincode);

  const onTryCode = async (code: string) => {
    if (await removePincode(code)) {
      setTimeout(() => navigation.goBack(), 0);
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
