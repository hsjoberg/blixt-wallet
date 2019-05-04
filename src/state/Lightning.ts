import { Action, action, Thunk, thunk } from "easy-peasy";

export interface ILightningModel {
  sendTransaction: Thunk<ILightningModel, string, any, any, Promise<string>>;
}

export default {
  sendTransaction: thunk((state, payload) => {
    return new Promise((res, rej) => {
      setTimeout(() => {
        console.log("Send transaction");
        res("TEST");
      }, 2000);
    });
  }),
} as ILightningModel;
