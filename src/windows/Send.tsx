import React, { useState, useRef, useEffect } from "react";
import { View } from "react-native";
import { Badge, Button, Container, Content, Footer, FooterTab, Icon, Item, Label, Text, Header, Left, Title, Body } from "native-base";
import { RNCamera, Barcode } from "react-native-camera";

interface ISendProps {
  onGoBackCallback: ( transactionInfo: any) => void;
  doneCallback: ( transactionInfo: any) => void;
  bolt11Invoice: string;
}

type State = "CAMERA" | "CONFIRMATION";

export default (props: ISendProps) => {
  const { onGoBackCallback, doneCallback } = props;
  const [ state, setState ] = useState<State>("CAMERA");
  const [ bolt11Invoice, setBolt11Invoice ] = useState<string | undefined>(undefined);

  useEffect(() => {
    console.log("useEffect inside Send.tsx");
    if (props.bolt11Invoice) {
      setBolt11Invoice(props.bolt11Invoice);
      setState("CONFIRMATION");
    }
  }, [bolt11Invoice, state]);

  if (state === "CAMERA") {
    return (
      <View>
        <RNCamera
          style={{ width: "100%", height: "100%"}}
          type={RNCamera.Constants.Type.back}
          permissionDialogTitle={"Permission to use camera"}
          permissionDialogMessage={"We need your permission to use your camera phone to be able to scan QR codes"}
          XonGoogleVisionBarcodesDetected={({ barcodes }) => {
            setBolt11Invoice(barcodes[0].data);
            setState("CONFIRMATION");
          }}
          onBarCodeRead={({ data }) => {
            setBolt11Invoice(data);
            setState("CONFIRMATION");
          }}
          captureAudio={false}
        />
      </View>
    );
  }
  else if (state === "CONFIRMATION") {
    return (
      <Container>
        <Header>
          <Left>
            <Button transparent={true} onPress={onGoBackCallback}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Confirm Pay Invoice</Title>
          </Body>
        </Header>

        <Text>fdsfds</Text>
        <Text>{bolt11Invoice}</Text>
        <Text>{JSON.stringify(bolt11Invoice)}</Text>
      </Container>
    );
  }
  else {
    return (
      <Text>Unknown state</Text>
    );
  }
};
