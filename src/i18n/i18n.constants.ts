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
    lightningNodeInfo: "settings.lightningNodeInfo",
    lightningPeers: "settings.lightningPeers",
    removePincodeAuth: "settings.removePincodeAuth",
    setPincode: "settings.setPincode",
    torShowOnionAddress: "settings.torShowOnionAddress",
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
  de: {
    id: "de",
    name: "Deutsch",
  },
  fr: {
    id: "fr",
    name: "Français",
  },
  nl: {
    id: "nl",
    name: "Nederlands",
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
  vi: {
    id: "vi",
    name: "Tiếng Việt",
  },
};
