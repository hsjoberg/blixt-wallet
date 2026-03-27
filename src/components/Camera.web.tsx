import React, { ReactNode, useEffect, useRef, useState } from "react";
import { InteractionManager, StyleProp, View, ViewStyle } from "react-native";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import Container from "./Container";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

const SCANNER_OPTIONS = {
  delayBetweenScanAttempts: 300,
  delayBetweenScanSuccess: 650,
};

export interface ICamera {
  active?: boolean;
  children?: ReactNode | JSX.Element;
  cameraType?: "front" | "back";
  onRead?: (text: string) => void;
  onNotAuthorized?: () => void;
  style?: StyleProp<ViewStyle>;
}

const getConstraints = (
  cameraType: ICamera["cameraType"],
  useFallbackConstraints: boolean,
): MediaStreamConstraints => {
  if (useFallbackConstraints) {
    return { video: true, audio: false };
  }

  return {
    video: {
      facingMode: { exact: cameraType === "front" ? "user" : "environment" },
    },
    audio: false,
  };
};

const getErrorName = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const cast = error as {
    name?: unknown;
  };

  return typeof cast.name === "string" ? cast.name : "";
};

const isConstraintError = (error: unknown) => {
  const name = getErrorName(error);
  return name === "OverconstrainedError" || name === "NotFoundError";
};

export default function CameraComponent({
  cameraType,
  children,
  onNotAuthorized,
  onRead,
  style,
  active,
}: ICamera) {
  const [start, setStart] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedTextRef = useRef("");
  const onNotAuthorizedCalledRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isActive = active ?? true;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setStart(true);
    });

    return () => {
      task.cancel();
    };
  }, []);

  useEffect(() => {
    setCameraUnavailable(false);
    onNotAuthorizedCalledRef.current = false;
  }, [cameraType, isActive]);

  useEffect(() => {
    if (!start || !isActive) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    const markCameraUnavailable = () => {
      setCameraUnavailable(true);
      if (!onNotAuthorizedCalledRef.current) {
        onNotAuthorizedCalledRef.current = true;
        onNotAuthorized?.();
      }
    };

    if (typeof window !== "undefined" && !window.isSecureContext) {
      markCameraUnavailable();
      return;
    }

    if (!videoRef.current || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      markCameraUnavailable();
      return;
    }

    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, SCANNER_OPTIONS);

    const startScanner = async (useFallbackConstraints: boolean) => {
      try {
        controlsRef.current = await reader.decodeFromConstraints(
          getConstraints(cameraType, useFallbackConstraints),
          videoRef.current ?? undefined,
          (result, _error, controls) => {
            controlsRef.current = controls;
            if (cancelled || !result) {
              return;
            }

            const text = result.getText();
            if (text && text !== lastScannedTextRef.current) {
              lastScannedTextRef.current = text;
              onRead?.(text);
            }
          },
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (!useFallbackConstraints && isConstraintError(error)) {
          controlsRef.current?.stop();
          controlsRef.current = null;
          await startScanner(true);
          return;
        }

        markCameraUnavailable();
      }
    };

    void startScanner(false);

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      lastScannedTextRef.current = "";
    };
  }, [start, isActive, cameraType, onNotAuthorized, onRead]);

  if (!start || !isActive || cameraUnavailable) {
    return <Container style={{ backgroundColor: "black" }}>{children}</Container>;
  }

  return (
    <View style={[{ width: "100%", height: "100%", backgroundColor: blixtTheme.dark }, style]}>
      <video
        ref={videoRef}
        muted={true}
        autoPlay={true}
        playsInline={true}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: cameraType === "front" ? "scaleX(-1)" : undefined,
        }}
      />
      {children}
    </View>
  );
}
