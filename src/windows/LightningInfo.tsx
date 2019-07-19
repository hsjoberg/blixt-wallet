import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Body, Text, Header, Container, Left, Button, Title, Right, Icon, H1, H3, Fab, Card, CardItem, Item, Form, Input } from "native-base";
import { RNCamera } from "react-native-camera";
import { Row } from "react-native-easy-grid";
import { NavigationScreenProp, createStackNavigator } from "react-navigation";
import { useStoreState, useStoreActions } from "../state/store";
import { IChannel } from "../lightning/channel";

import { lnrpc } from "../../proto/proto";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";


export interface IOpenChannelProps {
  navigation: NavigationScreenProp<{}>;
}
export const OpenChannel = ({ navigation }: IOpenChannelProps) => {
  const [peer, setPeer] = useState("");
  const [sat, setSat] = useState("");
  const connectAndOpenChannel = useStoreActions((actions) => actions.channel.connectAndOpenChannel);
  const [result, setResult] = useState<any>();

  const [camera, setCamera] = useState(false);

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
          setPeer(data);
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
          <Title>Open channel</Title>
        </Body>
      </Header>
      <Form>
        <Item>
          <Input placeholder="Channel" value={peer} onChangeText={setPeer} />
          <Icon type="AntDesign" name="camera" onPress={() => setCamera(true)} />
        </Item>
        <Item>
          <Input placeholder="Amount (satoshi)" onChangeText={setSat} />
        </Item>
        <Item last={true}>
          <Button onPress={async () => {
            const r = await connectAndOpenChannel({
              peer,
              amount: Number.parseInt(sat, 10),
            });
            console.log();
            setResult(r);
          }}>
            <Text>Open channel</Text>
          </Button>
        </Item>
      </Form>
      {result && <Text>{result.fundingTxId}</Text>}
    </Container>
  );
};


export interface IPendingOpenChannelCardProps {
  channel: lnrpc.PendingChannelsResponse.IPendingOpenChannel;
}
const PendingOpenChannelCard = ({ channel }: IPendingOpenChannelCardProps) => {
  if (!channel.channel) {
    return (<Text>Error</Text>);
  }

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.channel.remoteNodePub}</Text>
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Status</Text>
            </Left>
            <Right>
              <Text style={{...style.channelDetailValue, color: "orange"}}>Pending</Text>
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Amount in channel</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.channel.localBalance}/{channel.channel.capacity} satoshi</Text>
            </Right>
          </Row>
        </Body>
      </CardItem>
    </Card>
  );
};


export interface IChannelCardProps {
  channel: IChannel;
}
const ChannelCard = ({ channel }: IChannelCardProps) => {
  const closeChannel = useStoreActions((store) => store.channel.closeChannel);

  const close = async () => {
    const result = await closeChannel({
      fundingTx: channel.channelPoint.split(":")[0],
      outputIndex: Number.parseInt(channel.channelPoint.split(":")[1], 10),
    });
    console.log(result);
  };

  return (
    <Card style={style.channelCard}>
      <CardItem style={style.channelDetail}>
        <Body>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Node</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.remotePubkey}</Text>
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Status</Text>
            </Left>
            <Right>
              {channel.active ?
                <Text style={{...style.channelDetailValue, color: "green"}}>Active</Text>
                :
                <Text style={{...style.channelDetailValue, color: "red"}}>Inactive</Text>
              }
            </Right>
          </Row>
          <Row>
            <Left>
              <Text style={style.channelDetailTitle}>Amount in channel</Text>
            </Left>
            <Right>
              <Text style={style.channelDetailValue}>{channel.localBalance}/{channel.capacity} satoshi</Text>
            </Right>
          </Row>
          <Row>
            <Right>
              <Button style={{ marginTop: 14 }} danger={true} small={true} onPress={close}>
                <Text>Close channel</Text>
              </Button>
            </Right>
          </Row>
        </Body>
      </CardItem>
    </Card>
  );
};

interface ILightningInfoProps {
  navigation: NavigationScreenProp<{}>;
}
export const LightningInfo = ({ navigation }: ILightningInfoProps) => {
  const channels = useStoreState((store) => store.channel.channels);
  const pendingOpenChannels = useStoreState((store) => store.channel.pendingOpenChannels);
  const getChannels = useStoreActions((store) => store.channel.getChannels);
  const [fabActive, setFabActive] = useState(false);

  useEffect(() => {
    (async () => {
      await getChannels(undefined);
    })();
  }, [getChannels]);

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Lightning Network</Title>
        </Body>
        <Right>
          <Button transparent={true} onPress={async () => await getChannels(undefined)}>
            <Icon name="sync" />
          </Button>
        </Right>
      </Header>
      <ScrollView contentContainerStyle={style.container}>
        <View style={style.balanceInfo}>
          <H1 style={style.spendableTitle}>Spendable amount</H1>
          <H3 style={style.spendable}>
            {channels.reduce((accumulator, channel) => accumulator + channel.localBalance, 0)}
            &nbsp;satoshi
          </H3>
        </View>
        {pendingOpenChannels.map((pendingOpenChannel, i) => {
          <PendingOpenChannelCard key={i} channel={pendingOpenChannel} />
        })}
        {channels.map((channel) => (
          <ChannelCard key={channel.chanId} channel={channel} />
        ))}
      </ScrollView>
      <Fab
        active={fabActive}
        style={{ backgroundColor: blixtTheme.primary }}
        position="bottomRight"
        onPress={
          () => navigation.navigate("OpenChannel")
        }>
        <Icon type="Entypo" name="plus" style={{ color: blixtTheme.light }} />
      </Fab>
    </Container>
  );
};

const style = StyleSheet.create({
  container: {
    padding: 16,
  },
  balanceInfo: {
    alignItems: "center",
    padding: 16,
  },
  spendableTitle: {
    marginBottom: 8,
  },
  spendable: {
  },
  channelCard: {
    width: "100%",
    marginTop: 8,
  },
  channelDetail: {
  },
  channelDetails: {
    fontSize: 16,
  },
  channelDetailTitle: {
  },
  channelDetailValue: {
  },
});

export default createStackNavigator({
  LightningInfo,
  OpenChannel,
}, {
  headerMode: "none",
  initialRouteName: "LightningInfo",
});
