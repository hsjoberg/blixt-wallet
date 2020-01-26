import React from "react";
import { Button, Body, Container, Header, Icon, Left, Title } from "native-base";
import { NavigationScreenProp } from "react-navigation";

interface ILightningInfoProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: ILightningInfoProps) => {
  // const rpcReady = useStoreState((store) => store.lightning.rpcReady);

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Keysend</Title>
        </Body>
      </Header>
    </Container>
  );
}