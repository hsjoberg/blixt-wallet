import { Thunk, thunk } from "easy-peasy";
import { IStoreModel } from ".";
import { IStoreInjections } from "./store";
import { LndMobileEventEmitter } from "../utils/event-listener";
import logger from "../utils/log";
import { bytesToHexString, uint8ArrayToUnicodeString } from "../utils";
import { LSPS1_MESSAGE_TYPE } from "../utils/constants";
import { generateSecureRandom } from "react-native-securerandom";
import { th } from "date-fns/locale";

export interface ILspManagerModel {
  validateGetInfoResponse: Thunk<ILspManagerModel, Lsps1GetInfoResponse>;
  validateCreateOrderResponse: Thunk<
    ILspManagerModel,
    { response: Lsps1CreateOrderResponse; capacity: number },
    IStoreInjections
  >;
  makeGetInfoRequest: Thunk<
    ILspManagerModel,
    { pubkey: string },
    IStoreInjections,
    IStoreModel,
    Promise<Lsps1GetInfoResponse>
  >;
  createOrderRequest: Thunk<
    ILspManagerModel,
    { capacity: number; pubkey: string; id: string },
    IStoreInjections,
    IStoreModel,
    Promise<Lsps1CreateOrderResponse>
  >;
}

const log = logger("LspManager");

export type Payment = {
  state: "EXPECT_PAYMENT" | "HOLD" | "PAID" | "REFUNDED";
  fee_total_sat: string;
  order_total_sat: string;
  lightning_invoice: string;
  onchain_address: string;
  min_onchain_payment_confirmations: number;
  min_fee_for_0conf: number;
  onchain_payment: OnchainPayment;
};

export type OnchainPayment = {
  outpoint: string;
  sat: string;
  confirmed: boolean;
} | null;

export type Channel = {
  funded_at: string;
  funding_outpoint: string;
  expires_at: string;
} | null;

export type Lsps1GetInfoResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    website: string;
    options: {
      min_channel_confirmations: number;
      min_onchain_payment_confirmations: number | null;
      supports_zero_channel_reserve: boolean;
      min_onchain_payment_size_sat: number | null;
      max_channel_expiry_blocks: number;
      min_initial_client_balance_sat: string;
      max_initial_client_balance_sat: string;
      min_initial_lsp_balance_sat: string;
      max_initial_lsp_balance_sat: string;
      min_channel_balance_sat: string;
      max_channel_balance_sat: string;
    };
  };
};

export type Lsps1CreateOrderResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    order_id: string;
    lsp_balance_sat: string;
    client_balance_sat: string;
    confirms_within_blocks: number;
    channel_expiry_blocks: number;
    token: string;
    created_at: string;
    expires_at: string;
    announce_channel: boolean;
    order_state: "CREATED" | "COMPLETED" | "FAILED";
    payment: Payment;
    channel: Channel;
  };
};

export const lspManager: ILspManagerModel = {
  makeGetInfoRequest: thunk(async (actions, { pubkey }, { injections }) => {
    log.i("Making LSPS1 getInfo request", [pubkey]);
    const methodGetInfo = "lsps1.get_info";

    const id = await generateSecureRandom(32).then((bytes) => bytesToHexString(bytes));

    const request = {
      jsonrpc: "2.0",
      method: methodGetInfo,
      params: {},
      id,
    };

    return new Promise(async (resolve, reject) => {
      let resolved = false;

      const subscription = LndMobileEventEmitter.addListener(
        "SubscribeCustomMessages",
        (event: any) => {
          if (!event || typeof event !== "object") {
            return;
          }

          const customMessage = injections.lndMobile.index.decodeCustomMessage(event.data);

          const { data, type, peer } = customMessage;

          // Return early if its not an lsp message
          if (type !== LSPS1_MESSAGE_TYPE) {
            return;
          }

          if (!peer) {
            return;
          }

          const decodedData = uint8ArrayToUnicodeString(data);

          const parsedData: Lsps1GetInfoResponse = JSON.parse(decodedData);

          if (!parsedData.jsonrpc || parsedData.jsonrpc !== "2.0" || !parsedData.result) {
            return;
          }

          actions.validateGetInfoResponse(parsedData);

          if (parsedData.id === id) {
            resolved = true;

            // Clean up
            subscription.remove();

            resolve(parsedData);
          }
        },
      );

      // If the server doesn't respond within 5 seconds, reject the promise
      setTimeout(() => {
        if (!resolved) {
          subscription.remove();
          reject(new Error("LSPS1 getInfo request timed out"));
        }
      }, 5000);

      await injections.lndMobile.index.sendCustomMessage(
        pubkey,
        LSPS1_MESSAGE_TYPE,
        JSON.stringify(request),
      );
    });
  }),

  createOrderRequest: thunk(async (actions, { capacity, pubkey, id }, { injections }) => {
    log.i("Making LSPS1 order request", [pubkey]);
    const methodOrder = "lsps1.create_order";

    const params = {
      announce_channel: false,
      channel_expiry_blocks: 13000,
      client_balance_sat: Number().toString(), // push amounts not supported for now
      confirms_within_blocks: 6,
      lsp_balance_sat: capacity.toString(),
      token: String(),
    };

    const request = {
      jsonrpc: "2.0",
      method: methodOrder,
      params,
      id,
    };

    return new Promise(async (resolve, reject) => {
      let resolved = false;

      const subscription = LndMobileEventEmitter.addListener(
        "SubscribeCustomMessages",
        async (event: any) => {
          if (!event || typeof event !== "object") {
            return;
          }

          const customMessage = injections.lndMobile.index.decodeCustomMessage(event.data);

          const { data, type, peer } = customMessage;

          // Return early if its not an lsp message
          if (type !== LSPS1_MESSAGE_TYPE) {
            return;
          }

          if (!peer) {
            return;
          }

          const decodedData = uint8ArrayToUnicodeString(data);

          const parsedData: Lsps1CreateOrderResponse = JSON.parse(decodedData);

          console.log("parsedData for create order response", parsedData);

          if (!parsedData.jsonrpc || parsedData.jsonrpc !== "2.0" || !parsedData.result) {
            return;
          }

          try {
            await actions.validateCreateOrderResponse({ response: parsedData, capacity });
          } catch (e) {
            console.log("error validating create order response", e);
            reject(new Error(e.message));
          }

          if (parsedData.id === id) {
            resolved = true;

            // Clean up
            subscription.remove();

            resolve(parsedData);
          }

          // If the server doesn't respond within 5 seconds, reject the promise
          setTimeout(() => {
            if (!resolved) {
              subscription.remove();
              reject(new Error("LSPS1 getInfo request timed out"));
            }
          }, 5000);
        },
      );

      // If the server doesn't respond within 5 seconds, reject the promise
      setTimeout(() => {
        if (!resolved) {
          subscription.remove();
          reject(new Error("LSPS1 order request timed out"));
        }
      }, 5000);

      await injections.lndMobile.index.sendCustomMessage(
        pubkey,
        LSPS1_MESSAGE_TYPE,
        JSON.stringify(request),
      );
    });
  }),

  validateGetInfoResponse: thunk((_, response) => {
    if (!response.result) {
      throw new Error("No result in response");
    }
    if (response.result.website === undefined) {
      throw new Error("No website in response");
    }
    if (!response.result.options) {
      throw new Error("No options in response");
    }
    if (typeof response.result.options.min_channel_confirmations !== "number") {
      throw new Error("No min_channel_confirmations in response");
    }
    if (typeof response.result.options.supports_zero_channel_reserve !== "boolean") {
      throw new Error("No supports_zero_channel_reserve in response");
    }
    if (
      typeof response.result.options.max_channel_expiry_blocks !== "number" ||
      response.result.options.max_channel_expiry_blocks < 1
    ) {
      throw new Error("No max_channel_expiry_blocks in response");
    }
    if (
      typeof response.result.options.min_initial_client_balance_sat !== "string" ||
      parseInt(response.result.options.min_initial_client_balance_sat) < 0
    ) {
      throw new Error("No min_initial_client_balance_sat in response");
    }
    if (
      typeof response.result.options.max_initial_client_balance_sat !== "string" ||
      parseInt(response.result.options.max_initial_client_balance_sat) < 0
    ) {
      throw new Error("No max_initial_client_balance_sat in response");
    }
    if (
      typeof response.result.options.min_initial_lsp_balance_sat !== "string" ||
      parseInt(response.result.options.min_initial_lsp_balance_sat) < 0
    ) {
      throw new Error("No min_initial_lsp_balance_sat in response");
    }
    if (
      typeof response.result.options.max_initial_lsp_balance_sat !== "string" ||
      parseInt(response.result.options.max_initial_lsp_balance_sat) < 0
    ) {
      throw new Error("No max_initial_lsp_balance_sat in response");
    }
    if (
      typeof response.result.options.min_channel_balance_sat !== "string" ||
      parseInt(response.result.options.min_channel_balance_sat) < 0
    ) {
      throw new Error("No min_channel_balance_sat in response");
    }
    if (
      typeof response.result.options.max_channel_balance_sat !== "string" ||
      parseInt(response.result.options.max_channel_balance_sat) < 0
    ) {
      throw new Error("No max_channel_balance_sat in response");
    }

    return true;
  }),

  validateCreateOrderResponse: thunk(async (_, { response, capacity }, { injections }) => {
    if (!response.result) {
      throw new Error("No result in response");
    }
    if (response.result.order_id === undefined) {
      throw new Error("No order_id in response");
    }
    if (
      response.result.lsp_balance_sat === undefined ||
      parseInt(response.result.lsp_balance_sat) !== capacity
    ) {
      throw new Error("No lsp_balance_sat in response");
    }
    if (
      response.result.client_balance_sat === undefined ||
      parseInt(response.result.client_balance_sat) > 0
    ) {
      throw new Error("No client_balance_sat in response");
    }

    if (response.result.confirms_within_blocks !== 6) {
      throw new Error("No confirms_within_blocks in response");
    }

    if (response.result.channel_expiry_blocks !== 13000) {
      throw new Error("No channel_expiry_blocks in response");
    }

    if (response.result.created_at === undefined) {
      throw new Error("No created_at in response");
    }

    if (response.result.expires_at === undefined) {
      throw new Error("No expires_at in response");
    }
    if (response.result.announce_channel !== false) {
      throw new Error("No announce_channel in response");
    }

    if (response.result.order_state !== "CREATED") {
      throw new Error("No order_state in response");
    }

    if (response.result.payment === undefined) {
      throw new Error("No payment in response");
    }

    if (response.result.payment.lightning_invoice === undefined) {
      throw new Error("No lightning_invoice in response");
    }

    console.log("validating create order response almost reached end");

    await injections.lndMobile.index.decodePayReq(response.result.payment.lightning_invoice);

    console.log("validating create order response reached end");

    return true;
  }),
};
