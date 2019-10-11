import React, { useState, useMemo } from "react";
import { StatusBar, StyleSheet, Alert } from "react-native";
import { View, Button, H1, Card, CardItem, Text, Spinner, Icon, H3 } from "native-base";
import { NavigationScreenProp } from "react-navigation";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../../state/store";
import style from "./style";
import { smallScreen } from "../../utils/device";
import Container from "../../components/Container";
import Content from "../../components/Content";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const createWallet = useStoreActions((store) => store.createWallet);
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const seed = useStoreState((state) => state.walletSeed);
  const setSyncEnabled = useStoreActions((state) => state.scheduledSync.setSyncEnabled);
  const changeScheduledSyncEnabled = useStoreActions((state) => state.settings.changeScheduledSyncEnabled);
  const [confirmedWords, setConfirmedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<Array<string | undefined>>(new Array(24).fill(undefined));
  const [proceeding, setProceeding] = useState(false);
  const [loadSpinnerForButton, setLoadSpinnerForButton] = useState<"skip" | "proceed" | undefined>(undefined);

  const shuffledSeed: string[] = useMemo(() => {
    return shuffleArray(seed);
  }, [seed]);

  if (!seed) {
    return (<></>);
  }

  let seedCorrect = false;

  if (seed.length === confirmedWords.length) {
    seedCorrect = true;
    if (JSON.stringify(seed) !== JSON.stringify(confirmedWords)) {
      Alert.alert("Try again", "Sorry, you wrote the words in the wrong order, please try again.");
      setConfirmedWords([]);
      setSelectedWords([]);
    }
  }

  const onContinue = async () => {
    if (proceeding) {
      return;
    }
    setProceeding(true);
    await createWallet();
    await getAddress({});
    await setSyncEnabled(true); // TODO test
    await changeScheduledSyncEnabled(true);
    navigation.navigate("AddFunds");
  };

  const onBackspacePress = () => {
    const word = confirmedWords[confirmedWords.length - 1];
    const deleteWord = selectedWords.findIndex((w) => w === word);
    setSelectedWords((words) => {
      if (deleteWord !== -1) {
        words[deleteWord] = undefined;
      }
      return words;
    });

    setConfirmedWords((words) => words.slice(0, -1));
  };

  return (
    <Container>
      <StatusBar
        backgroundColor={blixtTheme.dark}
        hidden={false}
        translucent={false}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content style={style.content}>
        <View style={style.upperContent}>
          <Card style={style.card}>
            <CardItem style={style.cardItem}>
              <>
                <View style={style.wordColumn}>
                  {seed.slice(0, 8).map((word, i) => (
                    <Text
                      key={word + i}
                      style={{
                        color: confirmedWords.length === i ? blixtTheme.primary : blixtTheme.light,
                      }}
                    >
                      {i + 1}. {confirmedWords[i]}
                    </Text>
                  ))}
                </View>
                <View style={style.wordColumn}>
                  {seed.slice(8, 16).map((word, i) => (
                    <Text
                      key={word + i + 8}
                      style={{
                        color: confirmedWords.length === i + 8 ? blixtTheme.primary : blixtTheme.light,
                      }}
                    >
                      {i + 9}. {confirmedWords[i + 8]}
                    </Text>
                  ))}
                </View>
                <View style={style.wordColumn}>
                  {seed.slice(16, 24).map((word, i) => (
                    <Text
                      key={word + i + 16}
                      style={{
                        color: confirmedWords.length === i + 16 ? blixtTheme.primary : blixtTheme.light,
                      }}
                    >
                      {i + 17}. {confirmedWords[i + 16]}
                    </Text>
                  ))}
                </View>
              </>
            </CardItem>
          </Card>
        </View>
        <View style={style.lowerContent}>
          <View style={style.text}>
            <View style={style.headerView}>
              {smallScreen ?
                <H3 style={style.textHeader}>Confirm your seed</H3>
                :
                <H1 style={style.textHeader}>Confirm your seed</H1>
              }
              {confirmedWords.length > 0 &&
                <Icon type="FontAwesome5" name="backspace" style={{ fontSize: 24, marginRight: 10, marginBottom: 6 }} onPress={onBackspacePress}  />
              }
            </View>
            <View style={extraStyle.wordButtons}>
              {shuffledSeed.map((word, i) => (
                <Button
                  key={word + i}
                  disabled={selectedWords[i] !== undefined}
                  style={{
                    ...extraStyle.wordButton,
                    opacity: selectedWords[i] !== undefined ? 0 : 1}
                  }
                  onPress={() => {
                    setConfirmedWords([...confirmedWords, word])
                    setSelectedWords((words) => {
                      words[i] = word;
                      return words;
                    });
                  }}
                  small={true}
                >
                  <Text uppercase={false} style={extraStyle.wordButtonText}>{word}</Text>
                </Button>
              ))}
            </View>
          </View>
          <View style={style.buttons}>
            <Button onPress={() => { if (!proceeding) { setLoadSpinnerForButton("skip"); onContinue(); }}} block={true} style={{width: "50%", marginRight: 5 }}>
              <>
                {loadSpinnerForButton === "skip" && <Spinner color={blixtTheme.light} />}
                {loadSpinnerForButton !== "skip" && <Text>Skip</Text>}
              </>
            </Button>
            <Button disabled={!seedCorrect} onPress={() => { if (!proceeding) { setLoadSpinnerForButton("proceed"); onContinue(); }}} block={true} style={{width: "50%", marginLeft: 5 }}>
              <>
                {loadSpinnerForButton === "proceed" && <Spinner color={blixtTheme.light} />}
                {loadSpinnerForButton !== "proceed" && <Text>Proceed</Text>}
              </>
            </Button>
          </View>
        </View>
      </Content>
    </Container>
  );
};

const extraStyle = StyleSheet.create({
  wordButtons: {
    flexWrap: "wrap",
    flexDirection: "row",
  },
  wordButton: {
    margin: 2,
  },
  wordButtonText: {
    fontSize: 12,
  },
});

const shuffleArray = (originalArray: string[] | undefined) => {
  if (!originalArray) {
    return [];
  }
  const array = originalArray.slice(0);
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
  return array;
};
