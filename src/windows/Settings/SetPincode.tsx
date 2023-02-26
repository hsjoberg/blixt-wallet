import React, { useState } from "react";
import { Icon } from "native-base";
import { useNavigation } from "@react-navigation/native";
import { getStatusBarHeight } from "react-native-status-bar-height";

import { useStoreActions } from "../../state/store";
import Pincode from "../../components/Pincode";
import { PLATFORM } from "../../utils/constants";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

enum States {
  enter = "enter",
  confirm = "confirm",
}
export default function SetPincode() {
  const t = useTranslation(namespaces.settings.setPincode).t;
  const navigation = useNavigation();
  const [state, setState] = useState<States>(States.enter);
  const [pincode, setStatePincode] = useState<string | undefined>();
  const setPincode = useStoreActions((store) => store.security.setPincode);

  const onTryCode = async (code: string) => {
    if (state === States.enter) {
      setStatePincode(code);
      setState(States.confirm);
      return true;
    }

    if (pincode !== code) {
      return false;
    }
    await setPincode(code);
    setTimeout(() => navigation.goBack(), 0);
    return true;
  };

  return (
    <>
      <Pincode onTryCode={onTryCode} textAction={t(state)} />
      {PLATFORM !== "android" && (
        <Icon
          style={{
            position: "absolute",
            right: 0,
            padding: 4,
            top: getStatusBarHeight(true),
          }}
          type="Entypo"
          name="cross"
          onPress={() => navigation.goBack()}
        />
      )}
    </>
  );
}
