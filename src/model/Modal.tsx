import { Action, action } from "easy-peasy";


export enum EModalWindow {
  Receive,
  Send,
  Settings,
  BitcoinInfo,
  LightningInfo,
}

export interface IModalModel {
  active: EModalWindow | null;
  setActiveModal: Action<IModalModel, IModalModel["active"]>;
}

const modal: IModalModel = {
  active: null,
  setActiveModal: action((state, payload) => {
    state.active = payload;
  }),
};

export default modal;
