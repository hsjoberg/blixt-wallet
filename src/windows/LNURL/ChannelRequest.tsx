import React, { useEffect } from "react";
import { StatusBar, Vibration } from "react-native";
import { Spinner, Toast } from "native-base";

import Container from "../../components/Container";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import { NavigationScreenProp } from "react-navigation";

interface IChannelRequestProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IChannelRequestProps) => {
  const type = useStoreState((store) => store.lnUrl.type);
  const doChannelRequest = useStoreActions((store) => store.lnUrl.doChannelRequest);

  useEffect(() => {
    (async () => {
      if (type === "channelRequest") {
        try {
          const result = await doChannelRequest({
            private: true,
          });
          Vibration.vibrate(32);
          Toast.show({
            text: `Opening inbound channel`,
            type: "success",
            duration: 10000,
          });
          setTimeout(() => navigation.navigate("Overview"), 1);
        } catch (e) {
          console.log(e);
          Vibration.vibrate(50);
          Toast.show({
            text: "Error: " + e.message,
            type: "danger",
            duration: 10000,
          });
          setTimeout(() => navigation.navigate("Overview"), 1);
        }
      }
    })();
  }, [type]);

  return (
    <Container centered style={{ backgroundColor: blixtTheme.dark }}>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Spinner color={blixtTheme.light} size={55} />
    </Container>
  );
}
