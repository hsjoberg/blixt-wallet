import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import { Text, View, Button, H1, Card, CardItem, H3 } from "native-base";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreActions } from "../../state/store";
import style from "./style";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Seed">;
}
export default function Seed({ navigation }: IProps) {
  const getSeed = useStoreActions((store) => store.security.getSeed);
  const [seed, setSeed] = useState<string[] | undefined>();

  useEffect(() => {
    // tslint:disable-next-line: no-async-without-await, no-floating-promises
    (async () => {
      const s = await getSeed();
      if (!s) {
        console.error("Could not find seed");
        return;
      }

      setSeed(s);
    })();
  }, []);

  if (!seed) {
    return (<></>);
  }

  const onPressContinue = () => {
    navigation.replace("Confirm");
  }

  return (
    <Container>
      <StatusBar
        barStyle="light-content"
        hidden={false}
        backgroundColor="transparent"
        animated={true}
        translucent={true}
      />
      <View style={style.content}>
        <View style={style.upperContent}>
          <Card style={style.card}>
            <CardItem style={style.cardItem}>
              <>
                <View style={style.wordColumn}>
                  {seed.slice(0, 8).map((word, i) => (
                    <Text key={word + i}>{i + 1}. {word}</Text>
                  ))}
                </View>
                <View style={style.wordColumn}>
                {seed.slice(8, 16).map((word, i) => (
                    <Text key={word + i + 8}>{i + 9}. {word}</Text>
                  ))}
                </View>
                <View style={style.wordColumn}>
                {seed.slice(16, 24).map((word, i) => (
                    <Text key={word + i + 16}>{i + 17}. {word}</Text>
                  ))}
                </View>
              </>
            </CardItem>
          </Card>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            {smallScreen ?
              <H3 style={style.textHeader}>Welcome to Blixt Wallet!</H3>
              :
              <H1 style={style.textHeader}>Welcome to Blixt Wallet!</H1>
            }
            <Text>
              This is your backup seed.{"\n"}{"\n"}
              Write it down on a piece of paper and store it in a safe place.{"\n"}
              Should you lose access to your wallet,{"\n"}you may be able to recover your funds by using your backup seed.{"\n"}{"\n"}
              The seed standard being used is aezeed.
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={onPressContinue}>
              <Text>I have written it down</Text>
            </Button>
          </View>
        </View>
      </View>
    </Container>
  );
}
