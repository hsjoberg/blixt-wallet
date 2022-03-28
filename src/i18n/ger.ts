import { namespaces } from "./i18n.constants";

import common from "../../locales/ger/common.json";
import help from "../../locales/ger/help.json";
import overview from "../../locales/ger/overview.json";
import drawer from "../../locales/ger/drawer.json";
import syncInfo from "../../locales/ger/syncInfo.json";
import contacts_contactList from "../../locales/ger/contacts.contactList.json";
import initProcess_initLightning from "../../locales/ger/initProcess.initLightning.json";
import keysend_experiment from "../../locales/ger/keysend.experiment.json";
import lightningInfo_lightningInfo from "../../locales/ger/lightningInfo.lightningInfo.json";
import lightningInfo_openChannel from "../../locales/ger/lightningInfo.openChannel.json";
import LNURL_authRequest from "../../locales/ger/LNURL.authRequest.json";
import LNURL_channelRequest from "../../locales/ger/LNURL.channelRequest.json";
import LNURL_payRequest_payerData from "../../locales/ger/LNURL.payRequest.payerData.json";
import LNURL_payRequest_paymentCard from "../../locales/ger/LNURL.payRequest.paymentCard.json";
import LNURL_payRequest_paymentDone from "../../locales/ger/LNURL.payRequest.paymentDone.json";
import LNURL_LNURLPayRequest from "../../locales/ger/LNURL.LNURLPayRequest.json";
import LNURL_payRequestAboutLightningAddress from "../../locales/ger/LNURL.payRequestAboutLightningAddress.json";
import LNURL_withdrawRequest from "../../locales/ger/LNURL.withdrawRequest.json";
import onchain_onChainInfo from "../../locales/ger/onchain.onChainInfo.json";
import onchain_onChainTransactionDetails from "../../locales/ger/onchain.onChainTransactionDetails.json";
import onchain_onChainTransactionLog from "../../locales/ger/onchain.onChainTransactionLog.json";
import onchain_withdraw from "../../locales/ger/onchain.withdraw.json";
import receive_dunderLspInfo from "../../locales/ger/receive.dunderLspInfo.json";
import receive_receiveQr from "../../locales/ger/receive.receiveQr.json";
import receive_receiveSetup from "../../locales/ger/receive.receiveSetup.json";
import receive_receiveSetupLsp from "../../locales/ger/receive.receiveSetupLsp.json";
import send_sendConfirmation from "../../locales/ger/send.sendConfirmation.json";
import send_sendDone from "../../locales/ger/send.sendDone.json";
import settings_about from "../../locales/ger/settings.about.json";
import settings_connectToLightningPeer from "../../locales/ger/settings.connectToLightningPeer.json";
import settings_dunderDoctor from "../../locales/ger/settings.dunderDoctor.json";
import settings_lightningNodeInfo from "../../locales/ger/settings.lightningNodeInfo.json";
import settings_lightningPeers from "../../locales/ger/settings.lightningPeers.json";
import settings_lndLog from "../../locales/ger/settings.lndLog.json";
import settings_lndMobileHelpCenter from "../../locales/ger/settings.lndMobileHelpCenter.json";
import settings_removePincodeAuth from "../../locales/ger/settings.removePincodeAuth.json";
import settings_setPincode from "../../locales/ger/settings.setPincode.json";
import settings_settings from "../../locales/ger/settings.settings.json";
import settings_torShowOnionAddress from "../../locales/ger/settings.torShowOnionAddress.json";
import web_info from "../../locales/ger/web.info.json";
import webLN_browser from "../../locales/ger/webLN.browser.json";
import welcome_addFunds from "../../locales/ger/welcome.addFunds.json";
import welcome_almostDone from "../../locales/ger/welcome.almostDone.json";
import welcome_confirm from "../../locales/ger/welcome.confirm.json";
import welcome_googleDriveBackup from "../../locales/ger/welcome.googleDriveBackup.json";
import welcome_iCloudBackup from "../../locales/ger/welcome.iCloudBackup.json";
import welcome_restore from "../../locales/ger/welcome.restore.json";
import welcome_seed from "../../locales/ger/welcome.seed.json";
import welcome_start from "../../locales/ger/welcome.start.json";
import transactionDetails from "../../locales/ger/transactionDetails.json";

export default {
  [namespaces.common]: common,
  [namespaces.help]: help,
  [namespaces.overview]: overview,
  [namespaces.drawer]: drawer,
  [namespaces.syncInfo]: syncInfo,
  [namespaces.contacts.contactList]: contacts_contactList,
  [namespaces.initProcess.initLightning]: initProcess_initLightning,
  [namespaces.keysend.experiment]: keysend_experiment,
  [namespaces.lightningInfo.lightningInfo]: lightningInfo_lightningInfo,
  [namespaces.lightningInfo.openChannel]: lightningInfo_openChannel,
  [namespaces.LNURL.payRequest.payerData]: LNURL_payRequest_payerData,
  [namespaces.LNURL.payRequest.paymentCard]: LNURL_payRequest_paymentCard,
  [namespaces.LNURL.payRequest.paymentDone]: LNURL_payRequest_paymentDone,
  [namespaces.LNURL.authRequest]: LNURL_authRequest,
  [namespaces.LNURL.channelRequest]: LNURL_channelRequest,
  [namespaces.LNURL.LNURLPayRequest]: LNURL_LNURLPayRequest,
  [namespaces.LNURL.payRequestAboutLightningAddress]: LNURL_payRequestAboutLightningAddress,
  [namespaces.LNURL.withdrawRequest]: LNURL_withdrawRequest,
  [namespaces.onchain.onChainInfo]: onchain_onChainInfo,
  [namespaces.onchain.onChainTransactionDetails]: onchain_onChainTransactionDetails,
  [namespaces.onchain.onChainTransactionLog]: onchain_onChainTransactionLog,
  [namespaces.onchain.withdraw]: onchain_withdraw,
  [namespaces.receive.dunderLspInfo]: receive_dunderLspInfo,
  [namespaces.receive.receiveQr]: receive_receiveQr,
  [namespaces.receive.receiveSetup]: receive_receiveSetup,
  [namespaces.receive.receiveSetupLsp]: receive_receiveSetupLsp,
  [namespaces.send.sendConfirmation]: send_sendConfirmation,
  [namespaces.send.sendDone]: send_sendDone,
  [namespaces.send.sendDone]: send_sendDone,
  [namespaces.settings.about]: settings_about,
  [namespaces.settings.connectToLightningPeer]: settings_connectToLightningPeer,
  [namespaces.settings.dunderDoctor]: settings_dunderDoctor,
  [namespaces.settings.lightningNodeInfo]: settings_lightningNodeInfo,
  [namespaces.settings.lightningPeers]: settings_lightningPeers,
  [namespaces.settings.lndLog]: settings_lndLog,
  [namespaces.settings.lndMobileHelpCenter]: settings_lndMobileHelpCenter,
  [namespaces.settings.removePincodeAuth]: settings_removePincodeAuth,
  [namespaces.settings.setPincode]: settings_setPincode,
  [namespaces.settings.settings]: settings_settings,
  [namespaces.settings.torShowOnionAddress]: settings_torShowOnionAddress,
  [namespaces.web.info]: web_info,
  [namespaces.webLN.browser]: webLN_browser,
  [namespaces.welcome.addFunds]: welcome_addFunds,
  [namespaces.welcome.almostDone]: welcome_almostDone,
  [namespaces.welcome.confirm]: welcome_confirm,
  [namespaces.welcome.googleDriveBackup]: welcome_googleDriveBackup,
  [namespaces.welcome.iCloudBackup]: welcome_iCloudBackup,
  [namespaces.welcome.restore]: welcome_restore,
  [namespaces.welcome.seed]: welcome_seed,
  [namespaces.welcome.start]: welcome_start,
  [namespaces.transactionDetails]: transactionDetails,
};
