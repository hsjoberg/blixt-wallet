import React, { useEffect, useRef, useState } from "react";
import { Button, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Clipboard from "@react-native-clipboard/clipboard";
import { Icon } from "native-base";

import NativeCamera, { CameraDevice } from "../../../macos/camera/src/NativeBlixtCamera";
import CameraPreview from "../../../macos/camera/src/BlixtCameraPreviewNativeComponent";
import BarcodeMask from "../../components/BarCodeMask";
import GoBackIcon from "../../components/GoBackIcon";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreState } from "../../state/store";
import useEvaluateLightningCode from "../../hooks/useEvaluateLightningCode";
import usePromptLightningAddress from "../../hooks/usePromptLightningAddress";
import { Alert } from "../../utils/alert";
import { toast } from "../../utils";
import { SendStackParamList } from "./index";

interface Props {
  navigation: StackNavigationProp<SendStackParamList, "SendCamera">;
}

export default function SendCamera({ navigation }: Props) {
  const focused = useIsFocused();
  const rpcReady = useStoreState((store) => store.lightning.rpcReady);
  const evaluateLightningCode = useEvaluateLightningCode();
  const promptLightningAddress = usePromptLightningAddress();
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceID, setDeviceID] = useState("");
  const [permission, setPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(focused);
  focusedRef.current = focused;

  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    setError(null);
    setPermission(false);
    (async () => {
      try {
        const granted = await NativeCamera.requestPermission();
        if (cancelled) return;
        setPermission(granted);
        if (!granted) {
          setError(
            "Allow camera access in System Settings → Privacy & Security → Camera, then retry.",
          );
          return;
        }
        const cameras = await NativeCamera.getDevices();
        if (cancelled) return;
        setDevices(cameras);
        setDeviceID((previous) =>
          cameras.some((camera) => camera.id === previous) ? previous : (cameras[0]?.id ?? ""),
        );
        if (!cameras.length)
          setError("No camera found. Connect a camera and retry, or paste an invoice.");
      } catch (cause: any) {
        if (!cancelled) setError(cause.message ?? "Could not open the camera.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focused, retry]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
    };
  }, []);

  const gotoLnurl = (
    screen: "AuthRequest" | "ChannelRequest" | "PayRequest" | "WithdrawRequest",
  ) => {
    const parent = navigation.getParent();
    if (!parent?.navigate) {
      (navigation as any).replace("LNURL", { screen });
    } else if (parent.canGoBack()) {
      parent.goBack();
      setTimeout(() => parent.navigate("LNURL", { screen }), 220);
    } else {
      parent.navigate("LNURL", { screen });
    }
  };

  // Gate synchronously: consecutive frames can arrive before React commits busy.
  const tryInvoice = async (read: () => Promise<string> | string, errorPrefix: string) => {
    if (!focusedRef.current || busyRef.current || !rpcReady) return;
    busyRef.current = true;
    setBusy(true);
    setPaused(true);
    try {
      const value = await read();
      if (!focusedRef.current) return;
      const result = await evaluateLightningCode(value, errorPrefix);
      if (!focusedRef.current) return;
      switch (result) {
        case "BOLT11":
          (navigation as any).replace("Send", { screen: "SendConfirmation" });
          break;
        case "LNURLAuthRequest":
          gotoLnurl("AuthRequest");
          break;
        case "LNURLChannelRequest":
          gotoLnurl("ChannelRequest");
          break;
        case "LNURLPayRequest":
          gotoLnurl("PayRequest");
          break;
        case "LNURLWithdrawRequest":
          gotoLnurl("WithdrawRequest");
          break;
      }
    } catch (cause: any) {
      if (focusedRef.current)
        toast(cause.message ?? "Could not read the invoice.", 13000, "danger");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const onLightningAddress = async () => {
    if (!focusedRef.current || busyRef.current || !rpcReady) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const [accepted] = await promptLightningAddress();
      if (accepted && focusedRef.current) {
        setPaused(true);
        gotoLnurl("PayRequest");
      }
    } catch (cause: any) {
      if (focusedRef.current) toast(cause.message, 13000, "danger");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const chooseCamera = async () => {
    if (!focusedRef.current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const cameras = await NativeCamera.getDevices();
      if (!focusedRef.current) return;
      setDevices(cameras);
      if (!cameras.length) {
        setError("No camera found. Connect a camera and retry.");
        return;
      }
      await Alert.promiseAlert("Choose camera", undefined, [
        ...cameras.map((camera) => ({
          text: camera.name,
          onPress: () => {
            if (!focusedRef.current) return;
            setDeviceID(camera.id);
            setError(null);
            setPaused(false);
          },
        })),
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (cause: any) {
      if (focusedRef.current) setError(cause.message ?? "Could not list cameras.");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const active = focused && rpcReady && permission && !!deviceID && !error && !busy && !paused;
  return (
    <View style={styles.container}>
      {permission && !!deviceID && !error && (
        <CameraPreview
          key={retry}
          testID="send-camera-preview"
          style={StyleSheet.absoluteFill}
          active={active}
          deviceID={deviceID}
          onRead={(event) => {
            if (active) void tryInvoice(() => event.nativeEvent.value, "QR scan error");
          }}
          onCameraError={(event) => setError(event.nativeEvent.message)}
        />
      )}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {!error && (
          <BarcodeMask
            showAnimatedLine={false}
            edgeColor={blixtTheme.primary}
            width={265}
            height={265}
          />
        )}
        <GoBackIcon style={styles.goBack} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter Lightning address"
          style={styles.lightningAddress}
          onPress={onLightningAddress}
        >
          <Icon type="Ionicons" name="at" style={styles.icon} />
        </Pressable>
        {permission && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose camera"
            style={styles.swapCamera}
            onPress={chooseCamera}
          >
            <Icon type="Ionicons" name="camera-reverse" style={styles.icon} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paste invoice"
          testID="paste-clipboard"
          style={styles.paste}
          onPress={() => void tryInvoice(() => Clipboard.getString(), "Clipboard paste error")}
        >
          <Icon type="FontAwesome" name="paste" style={styles.icon} />
        </Pressable>
        <View pointerEvents="box-none" style={styles.status}>
          {!!error && (
            <>
              <Text style={styles.text}>{error}</Text>
              {!permission && (
                <Button
                  title="Open System Settings"
                  onPress={() => {
                    void Linking.openURL(
                      "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
                    ).catch(() => toast("Open System Settings → Privacy & Security → Camera."));
                  }}
                />
              )}
              <Button
                title="Retry camera"
                onPress={() => {
                  setPaused(false);
                  setRetry((value) => value + 1);
                }}
              />
            </>
          )}
          {!error && !rpcReady && (
            <Text style={styles.text}>Waiting for the wallet to be ready…</Text>
          )}
          {!error && rpcReady && busy && <Text style={styles.text}>Reading payment…</Text>}
          {!error && rpcReady && paused && !busy && (
            <Button title="Scan again" onPress={() => setPaused(false)} />
          )}
          {!error && !busy && !paused && (
            <Text style={styles.text}>
              {devices.find((camera) => camera.id === deviceID)?.name ?? "Opening camera…"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  goBack: { position: "absolute", top: 8, left: 8, padding: 9 },
  lightningAddress: { position: "absolute", padding: 9, top: 8, right: 14 },
  swapCamera: { position: "absolute", padding: 9, bottom: 10, left: 13 },
  paste: { position: "absolute", padding: 9, bottom: 12, right: 16 },
  icon: { fontSize: 28, color: blixtTheme.light },
  status: { position: "absolute", bottom: 64, left: 64, right: 64, alignItems: "center" },
  text: { color: "white", textAlign: "center", marginBottom: 12 },
});
