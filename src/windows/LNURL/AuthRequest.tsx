import React, { useEffect, useState } from "react";
import { Vibration, Alert } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useStoreState, useStoreActions } from "../../state/store";
import { getDomainFromURL, toast } from "../../utils";
import { timeout } from "../../../mocks/lndmobile/utils";
import { PLATFORM } from "../../utils/constants";

interface IAuthRequestProps {
  navigation: StackNavigationProp<{}>;
}
export default function LNURLChannelRequest({ navigation }: IAuthRequestProps) {
  const [done, setDone] = useState(false);
  const lnurlStr = useStoreState((store) => store.lnUrl.lnUrlStr);
  const type = useStoreState((store) => store.lnUrl.type);
  const doAuthRequest = useStoreActions((store) => store.lnUrl.doAuthRequest);
  const clear = useStoreActions((store) => store.lnUrl.clear);

  useEffect(() => {
    if (done) {
      return;
    }
    // tslint:disable-next-line
    (async () => {
      if (type === "login") {
        await timeout(100);

        if (PLATFORM === "ios") {
          Alert.alert("Not supported", "LNURL-auth is not yet supported on iOS");
          navigation.pop();
          return;
        }

        const domain = getDomainFromURL(lnurlStr!);
        Alert.alert(
          "Login request",
          `Do you want to login to ${domain}?`,
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const result = await doAuthRequest();
                  setDone(true);
                  clear();
                  Vibration.vibrate(32);
                  toast(
                    `Authenticated to ${domain}`,
                    10000,
                    "success",
                    "Okay"
                  );
                  navigation.pop();
                } catch (e) {
                  console.log(e);
                  setDone(true);
                  clear();
                  Vibration.vibrate(50);
                  toast(
                    "Error: " + e.message,
                    12000,
                    "warning",
                    "Okay"
                  );
                  navigation.pop();
                }
              }
            }, {
              text: 'No',
              onPress: () => {
                clear();
                navigation.pop();
              },
              style: 'cancel'
            },
          ]
        );
      }
    })();
  }, []);

  return (<></>);
}
