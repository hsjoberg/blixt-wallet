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
    payRequest: {
      payerData: "LNURL.payRequest.payerData",
      paymentCard: "LNURL.payRequest.paymentCard",
      paymentDone: "LNURL.payRequest.paymentDone",
    },
    authRequest: "LNURL.authRequest",
    channelRequest: "LNURL.channelRequest",
    LNURLPayRequest: "LNURL.LNURLPayRequest",
    payRequestAboutLightningAddress: "LNURL.payRequestAboutLightningAddress",
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
    receiveSetupLsp: "receive.receiveSetupLsp",
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
    dunderDoctor: "settings.dunderDoctor",
    lightningNodeInfo: "settings.lightningNodeInfo",
    lightningPeers: "settings.lightningPeers",
    lndLog: "settings.lndLog",
    lndMobileHelpCenter: "settings.lndMobileHelpCenter",
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
};
