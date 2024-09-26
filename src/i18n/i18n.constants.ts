export const namespaces = {
  common: "common",
  contacts: {
    contactList: "contacts.contactList",
  },
  initProcess: {
    initLightning: "initProcess.initLightning",
  },
  keysend: {
    experiment: "keysend.experiment",
  },
  lightningBox: {
    registration: "lightningBox.registration",
    info: "lightningBox.info",
  },
  lightningInfo: {
    lightningInfo: "lightningInfo.lightningInfo",
    openChannel: "lightningInfo.openChannel",
  },
  LNURL: {
    authRequest: "LNURL.authRequest",
    channelRequest: "LNURL.channelRequest",
    payRequest: "LNURL.payRequest",
    withdrawRequest: "LNURL.withdrawRequest",
  },
  onchain: {
    onChainInfo: "onchain.onChainInfo",
    onChainTransactionDetails: "onchain.onChainTransactionDetails",
    onChainTransactionLog: "onchain.onChainTransactionLog",
    withdraw: "onchain.withdraw",
  },
  receive: {
    dunderLspInfo: "receive.dunderLspInfo",
    receiveQr: "receive.receiveQr",
    receiveSetup: "receive.receiveSetup",
  },
  send: {
    sendCamera: "send.sendCamera",
    sendConfirmation: "send.sendConfirmation",
    sendDone: "send.sendDone",
  },
  settings: {
    about: "settings.about",
    settings: "settings.settings",
    connectToLightningPeer: "settings.connectToLightningPeer",
    lightningNetworkInfo: "settings.lightningNetworkInfo",
    lightningNodeInfo: "settings.lightningNodeInfo",
    lightningPeers: "settings.lightningPeers",
    removePincodeAuth: "settings.removePincodeAuth",
    setPincode: "settings.setPincode",
    torShowOnionAddress: "settings.torShowOnionAddress",
    toastLog: "settings.toastLog",
    debugLog: "settings.debugLog",
  },
  web: {
    info: "web.info",
  },
  webLN: {
    browser: "webLN.browser",
  },
  welcome: {
    addFunds: "welcome.addFunds",
    almostDone: "welcome.almostDone",
    confirm: "welcome.confirm",
    googleDriveBackup: "welcome.googleDriveBackup",
    iCloudBackup: "welcome.iCloudBackup",
    restore: "welcome.restore",
    seed: "welcome.seed",
    start: "welcome.start",
  },
  help: "help",
  overview: "overview",
  drawer: "drawer",
  syncInfo: "syncInfo",
  transactionDetails: "transactionDetails",
  footerNav: "footerNav",
};

interface ILanguages {
  [key: string]: {
    id: string;
    name: string;
  };
}

export const languages: ILanguages = {
  en: {
    id: "en",
    name: "English",
  },
  es: {
    id: "es",
    name: "Español",
  },
  cs: {
    id: "cs",
    name: "Čeština",
  },
  da: {
    id: "da",
    name: "Dansk",
  },
  de: {
    id: "de",
    name: "Deutsch",
  },
  hi: {
    id: "hi",
    name: "हिंदू",
  },
  hr: {
    id: "hr",
    name: "Hrvatski",
  },
  it: {
    id: "it",
    name: "Italiano",
  },
  ja: {
    id: "ja",
    name: "日本語",
  },
  fa: {
    id: "fa",
    name: "پارسی",
  },
  fi: {
    id: "fi",
    name: "Suomi",
  },
  fr: {
    id: "fr",
    name: "Français",
  },
  ko: {
    id: "ko",
    name: "한국인",
  },
  nl: {
    id: "nl",
    name: "Nederlands",
  },
  no: {
    id: "no",
    name: "Norsk",
  },
  pl: {
    id: "pl",
    name: "Polski",
  },
  pt: {
    id: "pt",
    name: "Português",
  },
  ru: {
    id: "ru",
    name: "Русский",
  },
  tlh: {
    id: "tlh",
    name: "Klingon",
  },
  sv: {
    id: "sv",
    name: "Svenska",
  },
  ro: {
    id: "ro",
    name: "Română",
  },
  sw: {
    id: "sw",
    name: "Swahili",
  },
  swKE: {
    id: "sw_KE",
    name: "Swahili (Kenyan)",
  },
  vi: {
    id: "vi",
    name: "Tiếng Việt",
  },
  zh: {
    id: "zh",
    name: "简体",
  },
  zhHant: {
    id: "zhHant",
    name: "繁體",
  },
  ar: {
    id: "ar",
    name: "(Experimental) اَلْعَرَبِيَّةُ",
  },
};
