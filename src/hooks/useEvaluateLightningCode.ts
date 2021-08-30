import { Alert } from "../utils/alert";
import { useStoreActions } from "../state/store";

type EvaluateLightningCodeResponse = "BOLT11" | "LNURLChannelRequest" | "LNURLAuthRequest" | "LNURLWithdrawRequest" | "LNURLPayRequest" | null;

export default function useEvaluateLightningCode() {
  const setPayment = useStoreActions((store) => store.send.setPayment);
  const setLNUrl = useStoreActions((store) => store.lnUrl.setLNUrl);
  const resolveLightningAddress = useStoreActions((store) => store.lnUrl.resolveLightningAddress);
  const lnUrlClear = useStoreActions((store) => store.lnUrl.clear);

  return async (code: string, errorPrefix: string): Promise<EvaluateLightningCodeResponse> => {
    code = code.toLowerCase();
    code = code.replace("lightning:", "");

    // Check LNURL fallback scheme
    // https://github.com/fiatjaf/lnurl-rfc/blob/luds/01.md#fallback-scheme
    var res = /^(http.*[&?]lightning=)?((lnurl|lnbc|lntb)([0-9]{1,}[a-z0-9]+){1})/.exec(code);
    if (res) {
      code = res[2];
    }

    if (code.includes("lightning=")) {
      code = code.split("lightning=")[1] ?? "";
    }

    // Check for lnurl
    if (code.startsWith("lnurl") || code.startsWith("keyauth")) {
      console.log("LNURL");
      try {
        let type: string;
        if (code.startsWith("lnurlp:") || code.startsWith("lnurlw:") || code.startsWith("lnurlc:")) {
          code = "https://" + code.substring(7).split(/[\s&]/)[0];
          type = await setLNUrl({ url: code })
        }
        else if (code.startsWith("keyauth:")) {
          code = "https://" + code.substring(8).split(/[\s&]/)[0];
          type = await setLNUrl({ url: code })
        } else {
          type = await setLNUrl({ bech32data: code });
        }

        if (type === "channelRequest") {
          return "LNURLChannelRequest";
        }
        else if (type === "login") {
          return "LNURLAuthRequest";
        }
        else if (type === "withdrawRequest") {
          return "LNURLWithdrawRequest";
        }
        else if (type === "payRequest") {
          return "LNURLPayRequest"
        }
        else {
          console.log("Unknown lnurl request: " + type);
          Alert.alert(`Unsupported LNURL request: ${type}`, undefined,
            [{ text: "OK", onPress: () => {
              // setCameraActive(true);
              // setScanning(true);
            }}]
          );
          lnUrlClear();
        }
      } catch (e) { }
    } else if (code.includes("@")) {
      if (await resolveLightningAddress(code)) {
        // gotoNextScreen("LNURL", { screen: "PayRequest" }, false);
        return "LNURLPayRequest";
      }
    }
    else {
      try {
        await setPayment({ paymentRequestStr: code });
        return "BOLT11";
      } catch (error) {
        Alert.alert(`${errorPrefix}: ${error.message}`, undefined, [{ text: "OK" }]);
      }
    }
    return null;
  };
}
