import modal, { IModalModel } from "./Modal";
import lightning, { ILightningModel } from "./Lightning";

export interface IStoreModel {
  modal: IModalModel;
  lightning: ILightningModel;
}

const model: IStoreModel = {
  modal,
  lightning,
};

export default model;
