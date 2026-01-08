import React, { useState, useEffect } from "react";
import { StatusBar } from "react-native";
import { Text, View, H1, Card, CardItem, H3 } from "native-base";
import { Button } from "../../components/Button";
import { StackNavigationProp } from "@react-navigation/stack";

import { WelcomeStackParamList } from "./index";
import { useStoreActions } from "../../state/store";
import style from "./style";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";
import GoBackIcon from "../../components/GoBackIcon";
import { PLATFORM } from "../../utils/constants";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

interface IProps {
  navigation: StackNavigationProp<WelcomeStackParamList, "Seed">;
}
export default function Seed({ navigation }: IProps) {
  const t = useTranslation(namespaces.welcome.seed).t;
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
      {PLATFORM !== "android" && <GoBackIcon style={style.goBack} />}
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
              <H3 style={style.textHeader}>{t("title")}</H3>
              :
              <H1 style={style.textHeader}>{t("title")}</H1>
            }
            <Text>
              {t("msg")}{"\n"}{"\n"}
              {t("msg1")}{"\n"}
              {t("msg2")},{"\n"}{t("msg3")}{"\n"}{"\n"}
              {t("msg4")}
            </Text>
          </View>
          <View style={style.buttons}>
            <Button style={style.button} block={true} onPress={onPressContinue}>
              <Text>{t("button")}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Container>
  );
}
