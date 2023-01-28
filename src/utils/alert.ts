// https://github.com/necolas/react-native-web/issues/1026#issuecomment-687572134
import { AlertButton, AlertStatic, AlertType, Alert as RealAlert, Platform } from "react-native";
import DialogAndroid from "react-native-dialogs";
import { PLATFORM } from "./constants";
import { navigate } from "./navigation";
import { IPromptNavigationProps } from "../windows/HelperWindows/Prompt";

class WebAlert implements AlertStatic {
  public alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (PLATFORM === "web") {
      if (buttons === undefined || buttons.length === 0) {
        window.alert([title, message].filter(Boolean).join('\n'));
        return;
      }

      const result = window.confirm([title, message].filter(Boolean).join('\n'));

      if (result === true) {
        const confirm = buttons.find(({ style }) => style !== 'cancel');
        confirm?.onPress?.();
        return;
      }

      const cancel = buttons.find(({ style }) => style === 'cancel');
      cancel?.onPress?.();
    } else {
      RealAlert.alert(
        title,
        message,
        buttons,
      );
    }
  }

  public promiseAlert(title: string, message: string | undefined, buttons: AlertButton[]): Promise<AlertButton> {
    return new Promise((resolve, reject) => {
      for (const button of buttons) {
        button.onPress = () => {
          resolve(button);
        }
      }

      this.alert(title, message, buttons);
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
    if (Platform.isElectron) {
      navigate<IPromptNavigationProps>("Prompt", {
        title,
        message,
        defaultValue,
        onOk: (result) => {
          if (typeof callbackOrButtons === "object") {
            const ok = callbackOrButtons.find(({ style }) => style !== "cancel");
            ok?.onPress?.(result);
          } else {
            callbackOrButtons?.(result);
          }
        },
        onCancel: () => {
          if (typeof callbackOrButtons === "object") {
            const cancel = callbackOrButtons.find(({ style }) => style === "cancel");
            cancel?.onPress?.();
          }
        }
      });
    } else if (PLATFORM === "web") {
      const result = window.prompt(message, defaultValue);
      if (result === null) {
        if (typeof callbackOrButtons === "object") {
          const cancel = callbackOrButtons.find(({ style }) => style === "cancel");
          cancel?.onPress?.();
        }
        // TODO callbackOrOptions?
      } else {
        if (typeof callbackOrButtons === "object") {
          const ok = callbackOrButtons.find(({ style }) => style !== "cancel");
          ok?.onPress?.(result);
        } else {
          callbackOrButtons?.(result);
        }
      }
    } else if (PLATFORM === "android") {
      const positiveText = typeof callbackOrButtons === "object" ? callbackOrButtons.find(
        (button) => button.style === "default"
      )?.text : undefined;
      const negativeText = typeof callbackOrButtons === "object" ? callbackOrButtons.find(
        (button) => button.style === "cancel"
      )?.text : undefined;

      DialogAndroid.prompt(
        title,
        message,
        {
          defaultValue,
          positiveText,
          negativeText,
          keyboardType,
        },
      ).then(({ action, text }: { action: "actionPosisive" | "actionNegative" | "actionDismiss", text: string }) => {
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
      });
    } else {
      RealAlert.prompt(
        title,
        message,
        callbackOrButtons,
        type,
        defaultValue,
        keyboardType,
      );
    }
  }

  public promisePromptCallback(
    title: string,
    message?: string,
    type?: AlertType,
    defaultValue?: string,
    keyboardType?: string
  ): Promise<string> {
    return new Promise((resolve) => {
      this.prompt(title, message, resolve, type, defaultValue, keyboardType);
    });
  }
}

export const Alert = new WebAlert();
