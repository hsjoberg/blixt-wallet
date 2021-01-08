import React from "react";
import { useNavigation } from "@react-navigation/native";
import { getStatusBarHeight } from "react-native-status-bar-height";

import { useStoreActions } from "../../state/store";
import Pincode from "../../components/Pincode";
import { PLATFORM } from "../../utils/constants";
import { Icon } from "native-base";

export default function RemovePincodeAuth() {
  const navigation = useNavigation();
  const removePincode = useStoreActions((store) => store.security.removePincode);

  const onTryCode = async (code: string) => {
    if (await removePincode(code)) {
      setTimeout(() => navigation.goBack(), 0);
      return true;
    }
    return false;
  }

  return (
    <>
      <Pincode onTryCode={onTryCode} textAction="Enter current pincode to remove pincode" />
      {PLATFORM !== "android" &&
        <Icon style={{
          position: "absolute",
          right: 0,
          padding: 4,
          top: getStatusBarHeight(true),
          }} type="Entypo" name="cross" onPress={() => navigation.goBack()}
        />
      }
    </>
  )
}
