import { Text } from "native-base";
import React, { useRef, useState } from "react";
import { Image, PixelRatio, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Image as AnimatedImage } from 'react-native-animatable';
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { timeout } from "../utils";
import { VersionName } from "../utils/build";


export function BlixtLogo() {
  const [blixtNumPress, setBlixtNumPress] = useState(0);
  const [animationActive, setAnimationActive] = useState(false);
  const blixtLogo = useRef<AnimatedImage & Image>(null);

  const doAnimation = async () => {
    if (!blixtLogo || !blixtLogo.current || animationActive) {
      return;
    }

    setAnimationActive(true);
    if (blixtNumPress === 6) {
      blixtLogo.current.zoomOutDown!(2300);
      return;
    } else {
      blixtLogo.current.rubberBand!(1500);
    }

    timeout(500).then(() => {
      setBlixtNumPress(blixtNumPress + 1);
      setAnimationActive(false);
    });
  };

  return (
    <TouchableWithoutFeedback onPress={doAnimation}>
      <AnimatedImage
        ref={blixtLogo}
        source={{
          uri: blixtLogoWebP,
        }}
        style={style.blixtLogo}
        width={75}
        height={75}
      />
    </TouchableWithoutFeedback>
  );
}

export default () => {
  return (
    <View style={style.container}>
      <BlixtLogo />
      <View style={style.textContainer}>
        <Text style={style.blixtTitle}>Blixt Wallet</Text>
        <Text style={style.version}>version {VersionName}</Text>
      </View>
    </View>
  )
}

const style = StyleSheet.create({
  container: {
    marginTop: 26,
    height: 200,
    marginBottom: -13,
    justifyContent: "center",
  },
  blixtLogo: {
    width: 75,
    height: 75,
    borderRadius: 55,
    alignSelf: "center",
    margin: 5,
  },
  textContainer: {
    width: 215,
    alignSelf: "center",
  },
  blixtTitle: {
    fontFamily: blixtTheme.fontMedium,
    fontSize: 40 / PixelRatio.getFontScale(),
  },
  version: {
    textAlign: "right",
    marginRight: 5,
    fontSize: 10,
  },
});

const blixtLogoWebP = "data:image/webp;base64,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";
