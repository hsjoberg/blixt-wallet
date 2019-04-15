import React from "react";
import { Button, Footer, FooterTab, Icon, Text } from "native-base";

interface IProps {
  onSendButtonClicked: () => void;
  onReceiveButtonClicked: () => void;
};

export default ({ onSendButtonClicked, onReceiveButtonClicked }: IProps) => {
  return (
    <Footer>
      {/*<FooterTab>
        <Button onPress={onChannelsButtonClicked}>
          <Icon type="Entypo" name="thunder-cloud" />
          <Text>Channels</Text>
        </Button>
      </FooterTab>*/}
      <FooterTab>
        <Button onPress={onReceiveButtonClicked}>
          {/*<Icon type="FontAwesome" name="qrcode" />*/}
          {/*<Icon type="MaterialCommunityIcons" name="qrcode" />*/}
          {/*<Icon type="Ionicons" name="barcode" />*/}
          {/*<Icon type="SimpleLineIcons" name="share-alt" />*/}
          {/*<Icon type="AntDesign" name="download" />*/}
          {<Icon type="AntDesign" name="qrcode" />}
          <Text>Receive</Text>
        </Button>
      </FooterTab>
      <FooterTab>
        <Button onPress={onSendButtonClicked}>
          {/*<Icon type="FontAwesome" name="send-o" />*/}
          {/*<Icon type="MaterialCommunityIcons" name="camera" />*/}
          {/*<Icon type="Ionicons" name="md-qr-scanner" />*/}
          {/*<Icon type="SimpleLineIcons" name="camera" />*/}
          <Icon type="AntDesign" name="camerao" />
          <Text>Send</Text>
        </Button>
      </FooterTab>
    </Footer>
  );
};
