import React, { useState } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { Container, Content } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions } from "../../state/store";
import Pincode from "../../components/Pincode";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}

enum States {
  enter = "Enter a pincode",
  confirm = "Confirm your pincode",
}
export default ({ navigation }: IProps) => {
  const [state, setState] = useState<States>(States.enter);
  const [pincode, setStatePincode] = useState<string | undefined>();
  const setPincode = useStoreActions((store) => store.security.setPincode);

  const onTryCode = async (code: string) => {
    if (state === States.enter) {
      setStatePincode(code);
      setState(States.confirm);
      return true;
    }

    if (pincode !== code) {
      return false;
    }
    await setPincode(code);
    setTimeout(() => navigation.pop(), 0);
    return true;
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
        <Pincode onTryCode={onTryCode} textAction={state} />
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
