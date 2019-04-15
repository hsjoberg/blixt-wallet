import React, { useState, useRef, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Alert, CheckBox, StatusBar} from "react-native";
import { Button, Container, Content, Icon, Item, Label, Text, Header, Left, Title, Body, Form, Input, CheckBox as CheckBoxNativeBase, Spinner, Right } from "native-base";
import { RNCamera, Barcode, CameraType } from "react-native-camera";
import * as Bech32 from "bech32";

interface ISendProps {
  onGoBackCallback: () => void;
  doneCallback: (transactionInfo: any) => void;
  bolt11Invoice?: string;
}

type State = "CAMERA" | "CONFIRMATION";

export default (props: ISendProps) => {
  const { onGoBackCallback, doneCallback } = props;
  const [ state, setState ] = useState<State>("CAMERA");
  const [ isPaying, setIsPaying ] = useState(false);
  const [ bolt11Invoice, setBolt11Invoice ] = useState<string | undefined>(undefined);
  const [ cameraType, setCameraType ] =
    useState<CameraType["back"] | CameraType["front"]>(RNCamera.Constants.Type.back);
  const [ scanning, setScanning ] = useState(true);
  const [ feeCap, setFeeCap ] = useState(true);

  const camera = useRef();

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
        <StatusBar
          hidden={false}
          backgroundColor="#000"
          animated={true}
          translucent={false}
        />
        <RNCamera
          style={{ width: "100%", height: "100%" }}
          type={cameraType}
          permissionDialogTitle={"Permission to use camera"}
          permissionDialogMessage={"We need your permission to use your camera phone to be able to scan QR codes"}
          XonGoogleVisionBarcodesDetected={({ barcodes }) => {
            setBolt11Invoice(barcodes[0].data);
            setState("CONFIRMATION");
          }}
          onBarCodeRead={({ data }) => {
            if (!scanning) {
              return;
            }
            try {
              const decodedBech32 = Bech32.decode(data, 1024);
              if (decodedBech32.prefix !== "lnbc") {
                setScanning(false);
                Alert.alert(`QR code is not a valid Bitcoin Lightning invoice`, undefined, [{
                  text: "OK",
                  onPress: () => setScanning(true),
                }]);
              }
              setBolt11Invoice(data);
              setState("CONFIRMATION");
            }
            catch (e) {
              setScanning(false);
              Alert.alert(`QR code is not a valid Lightning invoice`, undefined, [{
                text: "OK",
                onPress: () => setScanning(true),
              }]);
            }
          }}
          captureAudio={false}
        >
          <View style={StyleSheet.absoluteFill}>
            <Icon
              type="Ionicons"
              name="md-swap"
              onPress={() => {
                if (cameraType === RNCamera.Constants.Type.front) {
                  setCameraType(RNCamera.Constants.Type.back);
                }
                else if (cameraType === RNCamera.Constants.Type.back) {
                  setCameraType(RNCamera.Constants.Type.front);
                }
              }}
              style={{
                position: "absolute",
                fontSize: 26,
                color: "#DDD",
                padding: 4,
                bottom: 8,
                left: 8,
              }}
            />
            <Icon
              type="FontAwesome"
              name="paste"
              onPress={() => {
                setBolt11Invoice("lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w");
                setState("CONFIRMATION");
              }}
              style={{
                position: "absolute",
                fontSize: 26,
                color: "#DDD",
                padding: 4,
                bottom: 8,
                right: 8,
              }}
            />
          </View>
        </RNCamera>
      </View>
    );
  }
  else if (state === "CONFIRMATION") {
    return (
      <Container>
        <StatusBar
          hidden={false}
          backgroundColor="#000"
        />
        <Header>
          <Left>
            <Button transparent={true} onPress={onGoBackCallback}>
              <Icon name="arrow-back" />
            </Button>
          </Left>
          <Body>
            <Title>Confirm pay invoice</Title>
          </Body>
        </Header>
        <Content style={{width: "100%", height: "100%", flex: 1 }}>
          <View style={{ padding: 24 }}>
            <Item success={true} style={{ marginTop: 8 }}>
              <Label>Invoice</Label>
              <Input disabled={true} value={bolt11Invoice.substring(0, 27) + "..."} />
              <Icon name="checkmark-circle" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Amount ₿</Label>
              <Input disabled={true} value="0.01" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Amount $</Label>
              <Input disabled={true} value="50" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Message</Label>
              <Input disabled={true} value="Pay 100 sat to Bitrefill" />
            </Item>
            <Item style={{ marginTop: 16 }}>
              <Label>Cap fees at 3%</Label>
              <Right>
                <CheckBox onValueChange={(value) => setFeeCap(value)} value={feeCap} />
              </Right>
            </Item>
            <Item bordered={false} style={{ marginTop: 32 }}>
              <Button
                disabled={isPaying}
                style={{ width: "100%" }}
                block={true}
                success={true}
                onPress={() => {
                  setIsPaying(true);
                  setTimeout(() => {
                    doneCallback({});
                  }, 4000);
                }}>
                {! isPaying && <Text>Pay</Text>}
                {isPaying && <Spinner color="white" />}
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
