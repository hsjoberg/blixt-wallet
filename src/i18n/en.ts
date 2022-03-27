import { namespaces } from "./i18n.constants";

import common from "../../locales/en/common.json";
import help from "../../locales/en/help.json";
import overview from "../../locales/en/overview.json";
import drawer from "../../locales/en/drawer.json";
import syncInfo from "../../locales/en/syncInfo.json";
import contacts_contactList from "../../locales/en/contacts.contactList.json";
import initProcess_initLightning from "../../locales/en/initProcess.initLightning.json";
import keysend_experiment from "../../locales/en/keysend.experiment.json";
import lightningInfo_lightningInfo from "../../locales/en/lightningInfo.lightningInfo.json";
import lightningInfo_openChannel from "../../locales/en/lightningInfo.openChannel.json";
import LNURL_authRequest from "../../locales/en/LNURL.authRequest.json";
import LNURL_channelRequest from "../../locales/en/LNURL.channelRequest.json";
import LNURL_payRequest_payerData from "../../locales/en/LNURL.payRequest.payerData.json";
import LNURL_payRequest_paymentCard from "../../locales/en/LNURL.payRequest.paymentCard.json";
import LNURL_payRequest_paymentDone from "../../locales/en/LNURL.payRequest.paymentDone.json";
import LNURL_LNURLPayRequest from "../../locales/en/LNURL.LNURLPayRequest.json";
import LNURL_payRequestAboutLightningAddress from "../../locales/en/LNURL.payRequestAboutLightningAddress.json";
import LNURL_withdrawRequest from "../../locales/en/LNURL.withdrawRequest.json";
import onchain_onChainInfo from "../../locales/en/onchain.onChainInfo.json";
import onchain_onChainTransactionDetails from "../../locales/en/onchain.onChainTransactionDetails.json";
import onchain_onChainTransactionLog from "../../locales/en/onchain.onChainTransactionLog.json";
import onchain_withdraw from "../../locales/en/onchain.withdraw.json";
import receive_dunderLspInfo from "../../locales/en/receive.dunderLspInfo.json";
import receive_receiveQr from "../../locales/en/receive.receiveQr.json";
import receive_receiveSetup from "../../locales/en/receive.receiveSetup.json";
import receive_receiveSetupLsp from "../../locales/en/receive.receiveSetupLsp.json";
import send_sendConfirmation from "../../locales/en/send.sendConfirmation.json";
import send_sendDone from "../../locales/en/send.sendDone.json";
import settings_about from "../../locales/en/settings.about.json";
import settings_connectToLightningPeer from "../../locales/en/settings.connectToLightningPeer.json";
import settings_dunderDoctor from "../../locales/en/settings.dunderDoctor.json";
import settings_lightningNodeInfo from "../../locales/en/settings.lightningNodeInfo.json";
import settings_lightningPeers from "../../locales/en/settings.lightningPeers.json";
import settings_lndLog from "../../locales/en/settings.lndLog.json";
import settings_lndMobileHelpCenter from "../../locales/en/settings.lndMobileHelpCenter.json";
import settings_removePincodeAuth from "../../locales/en/settings.removePincodeAuth.json";
import settings_setPincode from "../../locales/en/settings.setPincode.json";
import settings_settings from "../../locales/en/settings.settings.json";
import settings_torShowOnionAddress from "../../locales/en/settings.torShowOnionAddress.json";
import web_info from "../../locales/en/web.info.json";
import webLN_browser from "../../locales/en/webLN.browser.json";
import welcome_addFunds from "../../locales/en/welcome.addFunds.json";
import welcome_almostDone from "../../locales/en/welcome.almostDone.json";
import welcome_confirm from "../../locales/en/welcome.confirm.json";
import welcome_googleDriveBackup from "../../locales/en/welcome.googleDriveBackup.json";
import welcome_iCloudBackup from "../../locales/en/welcome.iCloudBackup.json";
import welcome_restore from "../../locales/en/welcome.restore.json";
import welcome_seed from "../../locales/en/welcome.seed.json";
import welcome_start from "../../locales/en/welcome.start.json";

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
  [namespaces.LNURL.payRequestAboutLightningAddress]:
    LNURL_payRequestAboutLightningAddress,
  [namespaces.LNURL.withdrawRequest]: LNURL_withdrawRequest,
  [namespaces.onchain.onChainInfo]: onchain_onChainInfo,
  [namespaces.onchain.onChainTransactionDetails]:
    onchain_onChainTransactionDetails,
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
};
