// https://github.com/necolas/react-native-web/issues/1026#issuecomment-687572134
import { AlertButton, AlertStatic, AlertType, Alert as RealAlert } from "react-native";
import DialogAndroid from "react-native-dialogs";
import { PLATFORM } from "./constants";

class WebAlert implements AlertStatic {
  public alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (PLATFORM ==="web") {
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

  public prompt(
    title: string,
    message?: string,
    callbackOrButtons?: ((text: string) => void) | AlertButton[],
    type?: AlertType,
    defaultValue?: string,
    keyboardType?: string,
  ) {
    if (PLATFORM === "web") {
      const result = window.prompt(message, defaultValue);
      if (result === null) {
        if (typeof callbackOrButtons === "object") {
          const cancel = callbackOrButtons.find(({ style }) => style === "cancel");
          cancel?.onPress?.();
        }
      } else {
        if (typeof callbackOrButtons === "object") {
          const ok = callbackOrButtons.find(({ style }) => style !== "cancel");
          ok?.onPress?.(result);
        } else {
          callbackOrButtons?.(result);
        }
      }

    } else if (PLATFORM === "android") {
      DialogAndroid.prompt(
        "Name",
        "Choose a name that will be used in transactions\n\n" +
        "Your name will be seen in invoices to those who pay you as well as " +
        "people you pay to.",
        { defaultValue },
      ).then(({ action, text }: { action: "actionPosisive" | "actionNegative", text: string }) => {
        if (action === "actionNegative") {
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
}

export const Alert = new WebAlert();