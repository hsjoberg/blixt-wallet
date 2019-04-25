import modal, { IModalModel } from "./Modal";

export interface IStoreModel {
  modal: IModalModel;
}

const model: IStoreModel = {
  modal,
};

export default model;
