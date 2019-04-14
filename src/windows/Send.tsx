import React, { useState, useRef, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Badge, Button, Container, Content, Footer, FooterTab, Icon, Item, Label, Text, Header, Left, Title, Body, Form, Input} from "native-base";
import { RNCamera, Barcode, CameraType } from "react-native-camera";

const lnInvoice = "lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w";

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
  const [ cameraType, setCameraType ] = useState<CameraType>(RNCamera.Constants.Type.front);

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
          type={cameraType}
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
        >
          <View style={StyleSheet.absoluteFill}>
             <Icon onPress={() => {
               console.log("TERST");
             }} style={{
               position: "absolute",
               fontSize: 24,
               color: "#252525",
               padding: 4,
               bottom: 8,
               right: 8
             }} type="FontAwesome" name="paste" />
         </View>
        </RNCamera>
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
        <Content style={{width: "100%", height: "100%", flex: 1 }}>
          <View style={{ padding: 24 }}>
            <Item success style={{ marginTop: 8 }}>
              <Label>Invoice</Label>
              <Input disabled value={bolt11Invoice} />
              <Icon name="checkmark-circle" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Message</Label>
              <Input disabled value="Pay 100 sat to Bitrefill" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Amount ₿</Label>
              <Input disabled value="0.01" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Amount $</Label>
              <Input disabled value="50" />
            </Item>
            <Item bordered={false} style={{ marginTop: 16 }}>
              <Button
                style={{ width: "100%" }}
                block={true}
                success={true}
                onPress={() => setState("QR")}>
                  <Text>Create invoice</Text>
              </Button>
            </Item>
          </View>
        </Content>
      </Container>
    );
  }
  else {
    return (
      <Text>Unknown state</Text>
    );
  }
};
