import React from "react";
import { Button, Footer, FooterTab, Icon, Text } from "native-base";
import { useNavigation } from "@react-navigation/native";

export default function FooterNav() {
  const navigation = useNavigation();

  return (
    <Footer>
      <FooterTab>
        <Button testID="FOOTER_RECEIVE" onPress={() => navigation.navigate("Receive")}>
          {<Icon type="AntDesign" name="qrcode" />}
          <Text>Receive</Text>
        </Button>
      </FooterTab>
      <FooterTab>
        <Button testID="FOOTER_SEND" onPress={() => navigation.navigate("Send")}>
          <Icon type="AntDesign" name="camerao" />
          <Text>Send</Text>
        </Button>
      </FooterTab>
    </Footer>
  );
};
