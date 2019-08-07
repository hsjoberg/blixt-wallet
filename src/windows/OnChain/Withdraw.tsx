import React, { useState } from "react";
import { Body, Text, Header, Container, Left, Button, Title, Icon, Input, Toast, Spinner } from "native-base";
import { RNCamera } from "react-native-camera";
import { NavigationScreenProp } from "react-navigation";

import { useStoreActions } from "../../state/store";
import BlixtForm from "../../components/Form";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

export interface IOpenChannelProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IOpenChannelProps) => {
  const sendCoins = useStoreActions((actions) => actions.onChain.sendCoins);
  const getBalance = useStoreActions((actions) => actions.onChain.getBalance);
  const [address, setAddress] = useState("");
  const [sat, setSat] = useState("");
  const [sending, setSending] = useState(false);
  const [camera, setCamera] = useState(false);

  const onWithdrawClick = async () => {
    try {
      setSending(true);
      const result = await sendCoins({
        address,
        sat: Number.parseInt(sat, 10),
      });
      console.log(result);
      await getBalance(undefined);
      navigation.pop();

      Toast.show({
        duration: 6000,
        type: "success",
        text: "Withdraw succeeded",
        buttonText: "Okay",
      });
    } catch (e) {
      Toast.show({
        duration: 12000,
        type: "danger",
        text: `Error: ${e.message}`,
        buttonText: "Okay",
      });
      setSending(false);
    }
  };

  if (camera) {
    return (
      <RNCamera
        style={{ width: "100%", height: "100%" }}
        androidCameraPermissionOptions={{
          title: "Permission to use camera",
          message: "Permission to use the camera is needed to be able to scan QR codes",
          buttonPositive: "Okay",
        }}
        onBarCodeRead={({ data }) => {
          setAddress(data);
          setCamera(false);
        }}
        captureAudio={false}
      >
        {({ status }) => {
          if (status === "NOT_AUTHORIZED") {
            setTimeout(() => setCamera(false));
            return (<></>);
          }
          return (
            <></>
          );
        }}
      </RNCamera>
    );
  }

  return (
    <Container>
        <Header iosBarStyle="light-content" translucent={false}>
          <Left>
            <Button transparent={true} onPress={() => navigation.pop()}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Withdraw coins</Title>
          </Body>
        </Header>
        <BlixtForm
          items={[{
            key: "BTC_ADDRESS",
            title: "Address",
            component: (
              <>
                <Input placeholder="Bitcoin address" value={address} onChangeText={setAddress} />
                <Icon type="AntDesign" name="camera" onPress={() => setCamera(true)} />
              </>
            )
          }, {
            key: "AMOUNT",
            title: "Amount",
            component: (<Input placeholder="Amount (satoshi)" keyboardType="numeric" onChangeText={setSat} value={sat} />)
          }]}
          buttons={[
            <Button key="WITHDRAW" onPress={onWithdrawClick} block={true} primary={true}>
              {!sending && <Text>Withdraw</Text>}
              {sending && <Spinner color={blixtTheme.light} />}
            </Button>
          ]}
        />
      </Container>
  );
};
