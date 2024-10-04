import { Alert } from "../utils/alert";
import { useStoreActions } from "../state/store";
import { useNavigation, NavigationProp } from "@react-navigation/core";
import { NavigationRootStackParamList } from "../types";

export default function usePromptLightningAddress() {
  const resolveLightningAddress = useStoreActions((store) => store.lnUrl.resolveLightningAddress);
  const navigation = useNavigation<NavigationProp<NavigationRootStackParamList>>();

  return () =>
    new Promise<[boolean, string?]>((resolve, reject) => {
      Alert.prompt(
        "Lightning Address",
        "Enter Lightning Address\n(user@domain.com)",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve([false]),
          },
          {
            text: "Ok",
            onPress: async (text) => {
              try {
                const lightningAddress = (text ?? "").trim();
                navigation.navigate("LoadingModal");
                if (await resolveLightningAddress(lightningAddress)) {
                  navigation.goBack();
                  resolve([true, lightningAddress]);
                }
              } catch (error: any) {
                navigation.goBack();
                Alert.alert("Cannot send to Lightning Address", error.message);
                resolve([false]);
              }
            },
          },
        ],
        "plain-text",
        undefined,
        "email-address",
      );
    });
}
