import React from "react";
import { Button, Footer, FooterTab, Icon, Text } from "native-base";
import { useNavigation } from "@react-navigation/native";

export default () => {
  const navigation = useNavigation();

  return (
    <Footer>
      <FooterTab>
        <Button onPress={() => navigation.navigate("Receive")}>
          {<Icon type="AntDesign" name="qrcode" />}
          <Text>Receive</Text>
        </Button>
      </FooterTab>
      <FooterTab>
        <Button onPress={() => navigation.navigate("Send")}>
          <Icon type="AntDesign" name="camerao" />
          <Text>Send</Text>
        </Button>
      </FooterTab>
    </Footer>
  );
};
