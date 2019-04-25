import { Action, action } from "easy-peasy";

export interface IModalModel {
  active: "receive" | "send"  | "settings" | "bitcoin_info" | "lightning_info" | null;
  setActiveModal: Action<IModalModel, IModalModel["active"]>;
}

const modal: IModalModel = {
  active: null,
  setActiveModal: action((state, payload) => {
    state.active = payload;
  }),
};

export default modal;
