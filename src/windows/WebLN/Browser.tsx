import React, { useRef, useState, useEffect } from "react";
import { TextInput, StatusBar, StyleSheet, View, TouchableOpacity, BackHandler, ToastAndroid, Platform, KeyboardAvoidingView } from "react-native";
import { getStatusBarHeight } from "react-native-status-bar-height"
import { injectJs, onMessageHandler } from "react-native-webln";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Card, Icon } from "native-base";
import { WebView } from 'react-native-webview';
import Color from "color";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreActions } from "../../state/store";
import { RootStackParamList } from "../../Main";
import BlurModal from "../../components/BlurModal";
import { PLATFORM } from "../../utils/constants";
import { Alert } from "../../utils/alert";

import { useTranslation } from "react-i18next";
import { namespaces } from "../../i18n/i18n.constants";

const INITIAL_URL = "https://blixtwallet.github.io/webln";

interface IBrowserProps {
  navigation: StackNavigationProp<RootStackParamList, "WebLNBrowser">;
  route: RouteProp<RootStackParamList, "WebLNBrowser">;
}
export default function WebLNBrowser({ navigation, route }: IBrowserProps) {
  const t = useTranslation(namespaces.webLN.browser).t;
  const initialUrl = route.params ? route.params.url : INITIAL_URL;

  const [showWebview, setShowWebview] = useState(false); // To prevent white flash
  const webview = useRef<WebView>();
  const textInput = useRef<TextInput>();
  const [urlInput, setUrlInput] = useState("");
  const [url, setUrl] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [jsInjected, setJsInjected] = useState(false);
  const [disableBackHandler, setDisableBackHandler] = useState(false);
  const [weblnSupportDetected, setWeblnSupportDetected] = useState(false);

  const handleGetInfoRequest = useStoreActions((store) => store.webln.handleGetInfoRequest);
  const handleMakeInvoiceRequest = useStoreActions((store) => store.webln.handleMakeInvoiceRequest);
  const handleSendPaymentRequest = useStoreActions((store) => store.webln.handleSendPaymentRequest);
  const handleSignMessageRequest = useStoreActions((store) => store.webln.handleSignMessageRequest);
  const handleVerifyMessageRequest = useStoreActions((store) => store.webln.handleVerifyMessageRequest);
  const handleLNURL = useStoreActions((store) => store.webln.handleLNURL);

  useEffect(() => {
    console.log("disableBackHandler", disableBackHandler);
    if (disableBackHandler) {
      return;
    }

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      console.log(canGoBack);
      if (webview.current && canGoBack) {
        webview.current.goBack();
        return true;
      }
      closeBrowser();
      return true
    });

    return () => backHandler.remove();
  }, [canGoBack, disableBackHandler]);

  const onMessage = onMessageHandler(webview, {
    enable: async () => {
      setWeblnSupportDetected(true);
      return;
    },
    getInfo: async () => {
      setWeblnSupportDetected(true);
      return handleGetInfoRequest()
    },
    makeInvoice: async (args) => handleMakeInvoiceRequest({ requestUrl: url, data: args }),
    sendPayment: async (paymentRequestStr) => {
      try {
        setDisableBackHandler(true);
        return await handleSendPaymentRequest({
          data: paymentRequestStr,
          requestUrl: url,
          weblnPayment: true,
        });
      } catch (e) {
        throw e;
      } finally {
        setDisableBackHandler(false);
      }
    },
    signMessage: async (message: any) => {
      return handleSignMessageRequest({ data: message, requestUrl: url });
    },
    verifyMessage: async (signature: any, message: any) => {
      return handleVerifyMessageRequest({ data: { signature, message } });
    },

    // Non-WebLN
    foundInvoice: async (paymentRequestStr) => {
      try {
        console.log(paymentRequestStr);
        setDisableBackHandler(true);

        if (paymentRequestStr.indexOf("LNURL") === 0) {
          await handleLNURL({
            lnurl: paymentRequestStr,
          });
        }
        else {
          return await handleSendPaymentRequest({
            data: paymentRequestStr,
            requestUrl: url,
            weblnPayment: false,
          });
        }
      } catch (e) {
        throw e;
      } finally {
        console.log("setDisableBackHandler(false);");
        setDisableBackHandler(false);
      }
    }
  });

  const closeBrowser = () => {
    Alert.alert("", t("close"),
      [{
        text: t("buttons.yes",{ns:namespaces.common}),
        onPress: () => navigation.goBack()
      }, {
        text: t("buttons.yes",{ns:namespaces.common}),
        style: "cancel"
      }])
  };

  const onLongPressHome = () => {
    if (PLATFORM === "android") {
      ToastAndroid.show(t("home"), ToastAndroid.SHORT);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} enabled={PLATFORM === "ios"}>
      <BlurModal useModalComponent={false} noMargin goBackByClickingOutside={false} style={{ height: "100%" }}>
        <Card style={style.card}>
          <WebView
            containerStyle={{ opacity: showWebview ? 1 : 0 }}
            ref={webview}
            onMessage={onMessage}
            userAgent="BlixtWallet/alpha (WebLN)"
            source={{ uri: url }}
            onLoadStart={(e) => {
              console.log("onLoadStart");
              setJsInjected(false)
              setWeblnSupportDetected(false);
            }}
            onLoadProgress={(e) => {
              if (!jsInjected && e.nativeEvent.progress > 0.65) {
                webview.current!.injectJavaScript(injectJs());
                setJsInjected(true);
                console.log("Injected");
              }
            }}
            onLoadEnd={() => requestAnimationFrame(() => setShowWebview(true))}
            onNavigationStateChange={(e) => {
              if (canGoBack !== (e.url !== initialUrl)) {
                setCanGoBack(e.url !== initialUrl);
              }
              setUrl(e.url);
              setUrlInput(e.url);
              if (textInput.current) {
                textInput.current.blur();
              }
            }}
            onError={(e) => console.log(e)}
            style={style.webview}
          />
          <View style={style.urlNav}>
            <TouchableOpacity onPress={closeBrowser}>
              <Icon style={style.closeButton} type="AntDesign" name="close" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUrl(INITIAL_URL)} onLongPress={() => onLongPressHome()}>
              <Icon style={style.listButton} type="FontAwesome5" name="home" />
            </TouchableOpacity>
            {PLATFORM !== "android" &&
              <TouchableOpacity onPress={() => webview.current?.goBack()}>
                <Icon style={style.goBackButton} type="AntDesign" name="arrowleft" />
              </TouchableOpacity>
            }
            <View style={[style.weblnIndicator, { backgroundColor: weblnSupportDetected ? "blue" : "transparent"}]}></View>
            <TextInput
              ref={textInput}
              style={style.urlInput}
              value={urlInput}
              autoCapitalize="none"
              onChangeText={(text) => {
                setUrlInput(text);
              }}
              onSubmitEditing={(e) => {
                if (!e.nativeEvent.text.startsWith("https://") && !e.nativeEvent.text.startsWith("http://")) {
                  e.nativeEvent.text = "https://" + e.nativeEvent.text;
                }
                setUrl(e.nativeEvent.text);
              }}
              keyboardType="url"
              placeholder={t("placeholder")+"..."}
            />
            <TouchableOpacity onPress={() => webview.current!.reload()}>
              <Icon style={style.goButton} type="MaterialCommunityIcons" name="sync" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setUrl(urlInput)}>
              <Icon style={style.goButton} type="AntDesign" name="arrowright" />
            </TouchableOpacity>
          </View>
        </Card>
      </BlurModal>
    </KeyboardAvoidingView>
  );
}

const style = StyleSheet.create({
  blurOverlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    marginTop: (StatusBar.currentHeight ?? 0) + getStatusBarHeight(true) + 8,
    marginBottom: 12 + (PLATFORM === "ios" ? 7 : 0),
    marginLeft: 9,
    marginRight: 9,
    paddingTop: 8,
    paddingRight: 8,
    paddingLeft: 8,
    flex: 1,
    height: "100%",
  },
  webview: {
    width: "100%",
    height: "100%",
    flex: 1,
  },
  urlNav: {
    width: "100%",
    height: 45,
    flexDirection: "row",
    alignItems: "center",
  },
  urlInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    height: 28,
    fontSize: 13,
    backgroundColor: Color(blixtTheme.gray).lighten(0.28).hex(),
    borderRadius: 32,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 13,
    paddingRight: 8,
    color: blixtTheme.light,
  },
  closeButton: {
    paddingLeft: 3,
    paddingRight: 4,
  },
  listButton: {
    paddingLeft: 6,
    paddingRight: 5,
    marginRight: 4,
    fontSize: 20,
  },
  refreshButton: {
    fontSize: 23,
    paddingLeft: 5,
    paddingRight: 5,
  },
  goBackButton: {
    paddingLeft: 2,
    paddingRight: 6,
  },
  goButton: {
    paddingLeft: 5,
    paddingRight: 5,
  },
  weblnIndicator: {
    position: "relative",
    zIndex: 1000,
    marginLeft: 6,
    marginRight: -9,
    width: 3,
    height: 3,
    borderRadius: 8,
  }
});
