// https://github.com/necolas/react-native-web/issues/1026#issuecomment-687572134
import {
  AlertButton,
  AlertStatic,
  AlertType,
  Alert as RealAlert,
  Platform,
  ViewStyle,
} from "react-native";
import DialogAndroid from "react-native-dialogs";
import { IS_ELECTROBUN, PLATFORM } from "./constants";
import { getNavigator, navigate } from "./navigation";
import { IPromptNavigationProps } from "../windows/HelperWindows/Prompt";
import { IHelperAlertNavigationProps } from "../windows/HelperWindows/Alert";

export interface IHelperAlertOptions {
  maxWidth?: ViewStyle["maxWidth"];
}

class WebAlert implements AlertStatic {
  public alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (PLATFORM !== "web") {
      RealAlert.alert(title, message, buttons);
      return;
    }

    if (IS_ELECTROBUN && getNavigator()?.getRootState()?.routeNames.includes("HelperAlert")) {
      navigate<IHelperAlertNavigationProps>("HelperAlert", {
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: "OK" }],
      });
      return;
    }

    if (buttons === undefined || buttons.length === 0) {
      window.alert([title, message].filter(Boolean).join("\n"));
      return;
    }

    const result = window.confirm([title, message].filter(Boolean).join("\n"));

    if (result === true) {
      const confirm = buttons.find(({ style }) => style !== "cancel");
      confirm?.onPress?.();
      return;
    }

    const cancel = buttons.find(({ style }) => style === "cancel");
    cancel?.onPress?.();
  }

  public promiseAlert(
    title: string,
    message: string | undefined,
    buttons: AlertButton[],
    options?: IHelperAlertOptions,
  ): Promise<AlertButton> {
    return new Promise((resolve) => {
      const wrappedButtons = buttons.map((button) => ({
        ...button,
        onPress: () => {
          try {
            button.onPress?.();
          } finally {
            resolve(button);
          }
        },
      }));

      this.alert(title, message, wrappedButtons, options);
    });
  }

  public prompt(
    title: string,
    message?: string,
    callbackOrButtons?: ((text: string) => void) | AlertButton[],
    type?: AlertType,
    defaultValue?: string,
    keyboardType?: string,
  ) {
    if (Platform.OS === "web") {
      const onOk = (result: string) => {
        if (typeof callbackOrButtons === "object") {
          const ok = callbackOrButtons.find(({ style }) => style !== "cancel");
          ok?.onPress?.(result);
        } else {
          callbackOrButtons?.(result);
        }
      };
      const onCancel = () => {
        if (typeof callbackOrButtons === "object") {
          const cancel = callbackOrButtons.find(({ style }) => style === "cancel");
          cancel?.onPress?.();
        }
      };

      const canUsePromptScreen = getNavigator()?.getRootState()?.routeNames.includes("Prompt");
      if (canUsePromptScreen) {
        navigate<IPromptNavigationProps>("Prompt", {
          title,
          message,
          defaultValue,
          onOk,
          onCancel,
        });
        return;
      }

      const result = window.prompt(message, defaultValue);
      if (result === null) {
        onCancel();
      } else {
        onOk(result);
      }
    } else if (PLATFORM === "android") {
      const positiveText =
        typeof callbackOrButtons === "object"
          ? callbackOrButtons.find((button) => button.style === "default")?.text
          : undefined;
      const negativeText =
        typeof callbackOrButtons === "object"
          ? callbackOrButtons.find((button) => button.style === "cancel")?.text
          : undefined;

      DialogAndroid.prompt(title, message, {
        defaultValue,
        positiveText,
        negativeText,
        keyboardType,
      }).then(
        ({
          action,
          text,
        }: {
          action: "actionPosisive" | "actionNegative" | "actionDismiss";
          text: string;
        }) => {
          if (action === "actionNegative" || action === "actionDismiss") {
            if (typeof callbackOrButtons === "object") {
              const cancel = callbackOrButtons.find(({ style }) => style === "cancel");
              cancel?.onPress?.();
            }
          } else {
            if (typeof callbackOrButtons === "object") {
              const ok = callbackOrButtons.find(({ style }) => style !== "cancel");
              ok?.onPress?.(text);
            } else {
              callbackOrButtons?.(text);
            }
          }
        },
      );
    } else {
      RealAlert.prompt(title, message, callbackOrButtons, type, defaultValue, keyboardType);
    }
  }

  public promisePromptCallback(
    title: string,
    message?: string,
    type?: AlertType,
    defaultValue?: string,
    keyboardType?: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      this.prompt(
        title,
        message,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(null),
          },
          {
            text: "OK",
            style: "default",
            onPress: (text?: string) => resolve(text ?? ""),
          },
        ],
        type,
        defaultValue,
        keyboardType,
      );
    });
  }
}

export const Alert = new WebAlert();
