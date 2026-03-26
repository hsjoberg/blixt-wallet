import i18next from "i18next";
import { stopDaemon } from "react-native-turbo-lnd";

import { namespaces } from "../i18n/i18n.constants";
import NativeBlixtTools from "../turbomodules/NativeBlixtTools";
import { Alert } from "./alert";
import { PLATFORM } from "./constants";

type RestartAlertMode = "confirm" | "acknowledge" | "notice";

type ShowRestartNeededAlertOptions = {
  mode?: RestartAlertMode;
  stopDaemonFirst?: boolean;
};

const canRestartInCurrentRuntime = PLATFORM === "android" || PLATFORM === "web";

const getRestartDialogStrings = () => {
  return {
    title: i18next.t("bitcoinNetwork.restartDialog.title", {
      ns: namespaces.settings.settings,
    }),
    message: i18next.t("bitcoinNetwork.restartDialog.msg", {
      ns: namespaces.settings.settings,
    }),
    question: i18next.t("bitcoinNetwork.restartDialog.msg1", {
      ns: namespaces.settings.settings,
    }),
    ok: i18next.t("buttons.ok", { ns: namespaces.common }),
    yes: i18next.t("buttons.yes", { ns: namespaces.common }),
    no: i18next.t("buttons.no", { ns: namespaces.common }),
  };
};

export async function restartApp(options: { stopDaemonFirst?: boolean } = {}) {
  const { stopDaemonFirst = canRestartInCurrentRuntime } = options;

  if (stopDaemonFirst) {
    try {
      await stopDaemon({});
    } catch (error) {
      console.log(error);
    }
  }

  NativeBlixtTools.restartApp();
}

export async function restartAppOrNotify(options: { stopDaemonFirst?: boolean } = {}) {
  if (canRestartInCurrentRuntime) {
    await restartApp(options);
    return;
  }

  showRestartNeededAlert({ mode: "notice" });
}

export function showRestartNeededAlert(options: ShowRestartNeededAlertOptions = {}) {
  const { mode = "confirm", stopDaemonFirst = canRestartInCurrentRuntime } = options;
  const strings = getRestartDialogStrings();

  if (!canRestartInCurrentRuntime || mode === "notice") {
    Alert.alert(strings.title, strings.message);
    return;
  }

  if (mode === "acknowledge") {
    Alert.alert(strings.title, strings.message, [
      {
        style: "default",
        text: strings.ok,
        onPress: () => {
          void restartApp({ stopDaemonFirst });
        },
      },
    ]);
    return;
  }

  Alert.alert(strings.title, `${strings.message}\n${strings.question}`, [
    {
      style: "cancel",
      text: strings.no,
    },
    {
      style: "default",
      text: strings.yes,
      onPress: () => {
        void restartApp({ stopDaemonFirst });
      },
    },
  ]);
}
