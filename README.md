# Blixt Lightning Wallet

Blixt Wallet is an open source Lightning first Bitcoin Wallet for Android with focus on usability and user experience,
powered by lnd and Neutrino SPV.

<p>
  <img alt="Blixt Lightning Wallet screenshot" src="blixt-wallet-screenshot.png" width="390" />
</p>

## Features

- [x] Embedded lnd with Neutrino
- [x] Descriptive and clean transaction log
- [x] Receive payments
- [x] Autopilot
- [x] Pincode
- [x] Fingerprint
- [x] Optional Name that will be displayed on invoices
- [x] Optional "Payer" field for bookkeeping when creating invoice
- [x] Scheduled sync of chain background job
- [x] Local channel backup
- [x] Thor support/Partial [lnurl](https://github.com/btcontract/lnurl-rfc/blob/master/spec.md) support
- [ ] [WebLN](https://webln.dev/) support
- [ ] Channel backup to Google Drive
- [ ] WatchTower
- [ ] URL Payments
- [ ] Pay to Username

## Known bugs

The wallet uses lnd that is young and might have bugs. Check [lnd bug list here](https://github.com/lightningnetwork/lnd/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

## Development

Do you like React Native, Java SE 8 or Lightning? Come and help out!

## Build steps

- Install Go, Node, Yarn, react-native CLI, Android Studio and Android SDK (using npm instead of yarn might work)
- If needed, install an emulated android device inside Android Studio
- Build lnd for Android by following the steps in [build-android-aar.md](build-android-aar.md)
- Install Node packages: `yarn`
- Generate proto files: `yarn gen-proto`
- Run: `yarn start-metro`
- Run: `yarn testnet-debug` (make sure you either have an Android emulator running or an Android device connected via USB)

## Commit and code-style

Follow the code style of the file you are working in.
For commits, make descriptive and atomic git commits.

## License

MIT
