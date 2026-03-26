# Electrobun Backend

This document explains how the Electrobun desktop backend is wired in Blixt Wallet.

The short version is:

- The renderer is still the React Native Web app.
- Electrobun adds a Bun main-process backend underneath it.
- Renderer-side `.electrobun.ts` modules and Electrobun shims translate app calls into RPC.
- Bun handlers implement the desktop-specific behavior: storage, sqlite, logging, and Speedloader.

## Runtime Overview

The main entrypoint is [src/bun/index.ts](src/bun/index.ts).

At startup it:

- creates the OS-native app data/cache directory structure
- registers all app-specific RPC handlers
- creates the main `BrowserWindow`
- forwards backend logs into the webview console as `[backend:<level>] ...`

The registered backend handler groups are:

- `createBlixtToolsElectrobunHandlers()`
- `createNativeSpeedloaderElectrobunHandlers()`
- `createTurboSqliteElectrobunHandlers()`
- `createAsyncStorageElectrobunHandlers()`
- `createKeystoreElectrobunHandlers()`

The underlying RPC transport comes from:

- `react-native-turbo-lnd/electrobun/bun-rpc` in normal mode
- `defineElectrobunRPC("bun", ...)` directly in `fakelnd` mode

## Directory Layout

Important Electrobun paths are defined in [BlixtPaths.ts](src/backend/BlixtPaths.ts):

- app root:
  - Windows: `%APPDATA%/blixt-wallet[-fakelnd][-testnet]`
  - macOS: `~/Library/Application Support/blixt-wallet[-fakelnd][-testnet]`
  - Linux: `${XDG_DATA_HOME:-~/.local/share}/blixt-wallet[-fakelnd][-testnet]`
- LND root: `<app root>/lnd`
- cache:
  - Windows: `%LOCALAPPDATA%/blixt-wallet[-fakelnd][-testnet]`
  - macOS: `~/Library/Caches/blixt-wallet[-fakelnd][-testnet]`
  - Linux: `${XDG_CACHE_HOME:-~/.cache}/blixt-wallet[-fakelnd][-testnet]`
- sqlite: `<app root>/sqlite.db`
- key-value storage: `<app root>/kv.json`
- default file keystore: `<app root>/keystore.json`
- Windows secure keystore: `<app root>/keystore.dpapi`

Examples:
`blixt-wallet`, `blixt-wallet-testnet`, `blixt-wallet-fakelnd`, `blixt-wallet-fakelnd-testnet`

`getFilesDir()` for Electrobun intentionally returns the LND root, not the app root. In practice that means:

- `getFilesDir()` -> `<app root>/lnd`
- `getAppFolderPath()` -> `<app root>/`
- `getCacheDir()` -> `<cache root>`

This matters for Speedloader and `channel.db`, which are expected under `<app root>/lnd/data/...`.

## Wiring Model

Electrobun integration has three layers:

1. App-facing TurboModule or package API
2. Renderer-side Electrobun shim
3. Bun backend RPC handler

For local TurboModules, the pattern usually looks like this:

1. App code imports `src/turbomodules/NativeBlixtTools` or `src/turbomodules/NativeSpeedloader`.
2. Platform resolution selects the `.electrobun.ts` file.
3. That `.electrobun.ts` file forwards into `electrobun/src/shims/...`.
4. The shim calls `electrobunRequest(...)`.
5. Bun handles the request via `electrobun/src/backend/...`.

In practice, the relevant code lives in:

- `src/turbomodules/*.electrobun.ts` for the app-facing Electrobun TurboModule adapters
- `electrobun/src/shims/*` for the renderer-side RPC shims
- `electrobun/src/shared/rpc-client.web.ts` for the low-level Electrobun request helper

`electrobun/src/shared/rpc-client.web.ts` is the narrow bridge into Electrobun itself. It checks for the Electrobun runtime and then calls `invokeElectrobunRequest(...)` from `react-native-turbo-lnd/electrobun/custom-rpc`.

### Typed RPC Mapping

`BlixtTools` uses a typed RPC mapping derived from the TurboModule `Spec`, while `TurboSqlite` does not follow the public API shape directly in the backend.

That split is intentional:

- `BlixtTools` is a flat method surface, so backend and shim can derive method names and tuple params from the TurboModule `Spec`.
- `TurboSqlite` returns a live `Database` object, which cannot cross RPC directly, so the Bun side uses an explicit transport contract and the renderer shim reconstructs a spec-shaped `Database`.

## BlixtTools

The backend implementation lives in [BlixtTools.ts](src/backend/BlixtTools.ts).

It handles:

- `writeConfig`
- `generateSecureRandomAsBase64`
- `log`
- `getFilesDir`
- `getCacheDir`
- `getAppFolderPath`
- `tailLog`
- `observeLndLogFile`
- `tailSpeedloaderLog`

The typed RPC name generation lives in [blixt-tools-rpc.ts](src/shared/blixt-tools-rpc.ts).

Notes:

- `NativeBlixtTools.log(...)` goes to the backend logger, not just the renderer console.
- Backend logs are also mirrored into the webview console by [src/bun/index.ts](src/bun/index.ts).
- LND log tailing uses two internal helper RPC methods:
  - `__BlixtToolsReadLndLogDelta`
  - `__BlixtToolsGetLndLogCursor`

Those two helpers are intentionally manual and are not part of the public TurboModule-derived RPC surface.

## AsyncStorage Backend

The Electrobun AsyncStorage backend lives in [AsyncStorage.ts](src/backend/AsyncStorage.ts).

It stores string values in `<app root>/kv.json`.

Supported operations include:

- `getItem`
- `setItem`
- `removeItem`
- `clear`
- `getAllKeys`
- `multiGet`
- `multiSet`
- `multiRemove`
- `mergeItem`
- `multiMerge`

Notes:

- This backend currently keeps an in-process `kvStoreCache`.
- Values are persisted as strings, matching AsyncStorage behavior.
- JSON merges are handled in JS on the Bun side.

## Keystore

The Electrobun keystore facade is [Keystore.ts](src/backend/Keystore.ts).

It exposes RPC methods for:

- `__BlixtKeystoreGetItem`
- `__BlixtKeystoreGetAllItems`
- `__BlixtKeystoreSetItem`
- `__BlixtKeystoreRemoveItem`
- `__BlixtGetPaths`

The actual persistence is split by backend:

- [KeystoreStore.file.ts](src/backend/keystore/KeystoreStore.file.ts)
- [KeystoreStore.windows.ts](src/backend/keystore/KeystoreStore.windows.ts)
- [KeystoreStore.linux.ts](src/backend/keystore/KeystoreStore.linux.ts)

### Windows

Windows uses DPAPI with `DataProtectionScope.CurrentUser`.

Implementation details:

- Bun spawns `pwsh` first and falls back to `powershell`
- `.NET` `ProtectedData.Protect/Unprotect` performs the encryption
- the entire keystore is stored as one encrypted JSON blob
- ciphertext is written to `<app root>/keystore.dpapi`

Important properties:

- no plaintext fallback on Windows
- `removeItem("seed")` still works by decrypting, deleting the key, and rewriting the blob

### Linux

Linux uses Secret Service when possible, with file fallback.

Implementation details:

- Secret Service integration is done through `secret-tool`
- the full keystore is stored as one JSON payload in Secret Service
- the synthetic reported path is `secret-service://blixt-wallet/electrobun-keystore`

Selection rules:

1. If `keystore.json` already exists, keep using the file backend.
2. Otherwise, if Secret Service is available, use it.
3. Otherwise, fall back to `keystore.json`.

Availability checks include:

- `DBUS_SESSION_BUS_ADDRESS`
- presence of `secret-tool`
- whether Secret Service is reachable on the current session

Fallback reasons are logged once through the backend logger, for example:

- `Linux keystore: falling back to file store (secret-tool is not installed).`

If Secret Service is active, the backend logs:

- `Linux keystore: using Secret Service.`

Notes:

- no long-lived in-memory keystore cache
- if Secret Service becomes unavailable during use, the backend can fall back to the file store

### Other Platforms

Any non-Windows, non-Linux Electrobun platform currently uses the file backend.

That means plaintext JSON in:

- `<app root>/keystore.json`

## TurboSqlite

The Bun backend lives in [TurboSqlite.ts](src/backend/TurboSqlite.ts).

The renderer shim lives in [react-native-turbo-sqlite.ts](src/shims/react-native-turbo-sqlite.ts).

The shared transport contract lives in [turbo-sqlite-rpc.ts](src/shared/turbo-sqlite-rpc.ts).

This is one of the more important pieces to understand:

- The app-facing renderer shim follows the upstream `react-native-turbo-sqlite` `Spec`.
- The Bun backend does not pretend to implement `Spec`.
- Instead, Bun exposes a transport layer keyed by `databaseId`.

Flow:

1. Renderer calls `openDatabase(path)`.
2. Bun opens `<app root>/sqlite.db`.
3. Bun returns `{ databaseId, path }`.
4. The renderer shim creates a real `Database` object that closes over `databaseId`.
5. `executeSql(...)` and `close()` go back over RPC using that `databaseId`.

Notes:

- Electrobun always opens `<app root>/sqlite.db` currently.
- `getVersionString()` is shim-local and returns `electrobun-bun-sqlite`.
- There is also an internal `__TurboSqliteDeleteDatabase` helper used outside the public sqlite `Spec`.

## NativeSpeedloader

The Bun backend lives in [NativeSpeedloader.ts](src/backend/NativeSpeedloader.ts).

The renderer shim lives in [native-speedloader.ts](src/shims/native-speedloader.ts).

The app-facing TurboModule adapter is [NativeSpeedloader.electrobun.ts](../src/turbomodules/NativeSpeedloader.electrobun.ts).

Implementation details:

- uses `bun:ffi`
- loads the packaged desktop `liblnd`
- calls native `gossipSync(...)`
- calls native `cancelGossipSync()`
- uses a native callback struct and `JSCallback` to resolve or reject the JS promise

Current behavior:

- single in-flight gossip sync only
- a second `gossipSync()` while one is active throws an explicit error
- `cancelGossipSync()` rejects the active promise with `Gossip sync cancelled by user`
- the network type passed to native is hardcoded to `"wifi"`

Library resolution searches for:

- `liblnd.dll` on Windows
- `liblnd.so` on Linux
- `liblnd.dylib` on macOS

It checks the current working directory, the Bun executable directory, packaged-resource locations, and then walks parent directories for development layouts.

## Logging

Backend logging is centralized in [BackendLog.ts](src/backend/BackendLog.ts).

The current behavior is:

- backend code logs normally in Bun
- the Bun entrypoint forwards each backend log line into the webview console
- renderer log calls through `NativeBlixtTools.log(...)` also go back to the backend

That means log messages can show up in both places:

- Bun/backend console
- renderer/webview console

## Fake LND vs Normal Mode

`src/bun/index.ts` checks `process.env.FLAVOR`.

- `fakelnd` uses plain Electrobun RPC registration
- normal mode layers the app handlers on top of the `react-native-turbo-lnd` Electrobun RPC setup

This is why the app-specific handlers are merged into `additionalHandlers` before RPC creation.

## Important Gotchas

- Do not import `electrobun/src/...` files from shared app code unless the file is truly Electrobun-only. Metro can otherwise try to resolve Electrobun internals on Android/iOS.
- `getFilesDir()` means the LND root in Electrobun, not the generic app root.
- `TurboSqlite` is spec-shaped in the renderer shim, not in the Bun transport.
- The Linux keystore may legitimately fall back to `keystore.json`; this is expected behavior, not necessarily a bug.
- Plain Vite web is not the same as Electrobun, even though both use `.web`/webview code paths in places. Electrobun-specific RPC calls must still be runtime-guarded.

## Files To Read First

If you are changing the Electrobun backend, start here:

- `electrobun/src/bun/index.ts`
- `electrobun/src/backend/BlixtPaths.ts`
- `electrobun/src/backend/BlixtTools.ts`
- `electrobun/src/backend/Keystore.ts`
- `electrobun/src/backend/TurboSqlite.ts`
- `electrobun/src/backend/NativeSpeedloader.ts`
- `electrobun/src/shims/native-blixt-tools.ts`
- `electrobun/src/shims/react-native-turbo-sqlite.ts`
