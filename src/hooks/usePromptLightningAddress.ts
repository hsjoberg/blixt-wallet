import { Alert } from "../utils/alert";
import { useStoreActions } from "../state/store";

export default function usePromptLightningAddress() {
  const resolveLightningAddress = useStoreActions((store) => store.lnUrl.resolveLightningAddress);

  return () => new Promise<boolean>((resolve, reject) => {
    Alert.prompt(
      "Lightning Address",
      "Enter Lightning Address\n(user@domain.com)",
      [{
        text: "Cancel",
        style: "cancel",
        onPress: () => resolve(false),
      }, {
        text: "Ok",
        onPress: async (text) => {
          try {
            if (await resolveLightningAddress((text ?? "").trim())) {
              resolve(true);
            }
          } catch (error) {
            Alert.alert("Cannot send to Lightning Address", error.message);
            resolve(false);
          }
        },
      }],
      "plain-text",
      undefined,
      "email-address",
    );
  });
}
