import { setItem, StorageItem } from "../../src/storage/app";
import { initCommonStore } from "../utils";
import {
  GDRIVE_FILES_URL,
  GDRIVE_UPLOAD_FILES_URL,
  IGoogleDriveAPIGetFiles,
} from "../../src/utils/google-drive";
global.fetch = require("jest-fetch-mock");

jest.setTimeout(20000);

test("initialize google drive store", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = await initCommonStore(true);

  expect(store.getState().googleDriveBackup.channelUpdateSubscriptionStarted).toBe(true);
});

const mockGDriveGetFilesOnce = () => {
  fetch.mockResponseOnce(
    JSON.stringify({
      files: [
        {
          id: "123",
          mimeType: "application/base64",
          name: "mock-backup",
          kind: "drive#file",
        },
      ],
    } as IGoogleDriveAPIGetFiles),
    {
      status: 200,
      headers: { "Content-type": "application/json" },
    },
  );
};

test("get backup file", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = await initCommonStore(true);

  const backupFile = "gdrivebackupjestmock";

  mockGDriveGetFilesOnce();
  fetch.mockResponseOnce(backupFile);

  expect(await store.getActions().googleDriveBackup.getBackupFile()).toBe(backupFile);
});

test("upload backup file", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = await initCommonStore(true);

  mockGDriveGetFilesOnce();

  expect(async () => await store.getActions().googleDriveBackup.makeBackup()).not.toThrow();
});
