import { LayoutAnimation } from "react-native";
import { Thunk, thunk, Action, action, Computed, computed } from "easy-peasy";
import { IContact, getContacts, createContact, updateContact, deleteContact } from "../storage/database/contact";

import { IStoreModel } from "./index";
import logger from "./../utils/log";
const log = logger("Contacts");

type ContactId = number;

export interface IContactsModel {
  addContact: Action<IContactsModel, IContact>;
  updateContact: Action<IContactsModel, { contact: IContact }>;

  syncContact: Thunk<IContactsModel, IContact, any, IStoreModel>;

  deleteContact: Thunk<IContactsModel, ContactId, any, IStoreModel>;

  getContacts: Thunk<IContactsModel, undefined, any, IStoreModel>;
  setContacts: Action<IContactsModel, IContact[]>;

  contacts: IContact[];
  getContactByLightningAddress: Computed<IContactsModel, (lightningAddress: string) => IContact | undefined>;
  getContactByLnUrlPay: Computed<IContactsModel, (lnUrlPay: string) => IContact | undefined>;
  getContactByLnUrlWithdraw: Computed<IContactsModel, (lnUrlWithdraw: string) => IContact | undefined>;
}

export const contacts: IContactsModel = {
  /**
   * Synchronizes a contact
   * Checks if we have it in our contact array, otherwise create a new contact in the db
   */
  syncContact: thunk(async (actions, tx, { getState, getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("syncContact(): db not ready");
    }
    const contacts = getState().contacts;
    let foundContact = false;

    for (const contactIt of contacts) {
      if (contactIt.id === tx.id) {
        await updateContact(db, { ...contactIt, ...tx });
        actions.updateContact({ contact: { ...contactIt, ...tx }});
        foundContact = true;
      }
    }

    if (!foundContact) {
      const id = await createContact(db, tx);
      // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      actions.addContact({ ...tx, id });
    }
  }),


  /**
   * Delete a contact
   * Deletes a contact by Id in the database, then removes it from our contact array
   */
  deleteContact: thunk(async (actions, id, { getState, getStoreState }) => {
    const db = getStoreState().db;
    if (!db) {
      throw new Error("deleteContact(): db not ready");
    }
    const contacts = getState().contacts;
    await deleteContact(db, id);
    actions.setContacts(contacts.filter((contact) => contact.id !== id));
  }),

  /**
   * Updates a transaction in our transaction array
   */
  updateContact: action((state, { contact }) => {
    for (let i = 0; i < state.contacts.length; i++) {
      if (state.contacts[i].id === contact.id) {
        state.contacts[i] = contact;
      }
    }
  }),

  /**
   * Add a contact
   */
  addContact: action((state, tx) => {
    state.contacts.unshift(tx);
  }),

  /**
   * Get contacts from the db
   * and add it to our contact array
   */
  getContacts: thunk(async (actions, _, { getStoreState }) => {
    log.d("getContacts()");
    const db = getStoreState().db;
    if (!db) {
      throw new Error("getContacts(): db not ready");
    }

    const transactions = await getContacts(db);
    actions.setContacts(transactions);
    log.d("getContacts() done");
  }),

  /**
   * Set contacts to our contact array
   */
  setContacts: action((state, contacts) => { state.contacts = contacts; }),

  contacts: [],
  getContactByLightningAddress: computed(
    (state) => {
      return (lightningAddress: string) => {
        return state.contacts.find((c) => lightningAddress === c.lightningAddress);
      };
    },
  ),
  getContactByLnUrlPay: computed(
    (state) => {
      return (lnUrlPay: string) => {
        return state.contacts.find((c) => lnUrlPay === c.lnUrlPay);
      };
    },
  ),
  getContactByLnUrlWithdraw: computed(
    (state) => {
      return (lnUrlWithdraw: string) => {
        return state.contacts.find((c) => lnUrlWithdraw === c.lnUrlWithdraw);
      };
    },
  ),
};
