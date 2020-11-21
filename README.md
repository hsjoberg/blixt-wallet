# Blixt Lightning Wallet

<a href="https://play.google.com/apps/testing/com.blixtwallet"><img alt="Get it on Google Play" width="200" height="77" src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" /></a>

Blixt Wallet is an open source Lightning Bitcoin Wallet for Android with focus on usability and user experience,
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
- [x] Optional Recipient/Sender name that will be displayed on transactions
- [x] Optional "Payer" field for bookkeeping when creating invoice
- [x] Scheduled sync of chain background job
- [x] Local channel backup
- [x] [LNURL](https://github.com/btcontract/lnurl-rfc) support (all sub-protocols: pay, channel, auth and withdraw)
- [x] Channel backup to Google Drive
- [x] [WebLN](https://webln.dev/) browser
- [x] Support for [Multi-Part Payments (MPP)](https://lightning.engineering/posts/2020-05-07-mpp/)
- [x] Integrated Tor support
- [ ] NFC
- [ ] WatchTower
- [ ] URL Payments
- [ ] Pay to Username

## Known Bugs

The wallet uses lnd that is young and might have bugs. Check [lnd bug list here](https://github.com/lightningnetwork/lnd/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

## Development

Do you like React Native, Java or Lightning? Come and help out!

## Build Steps

- Install [Node](https://nodejs.org), [Yarn](https://classic.yarnpkg.com/), [Android Studio + Android SDK (including NDK)](https://developer.android.com/studio/)
- If needed, install an emulated android device inside Android Studio
- Download lnd binary from [blixt-lndmobile-releases](https://github.com/BlixtWallet/blixt-lndmobile-releases/releases) and put it in `android/lndmobile`. Alternatively build lnd for Android by following the steps in [build-android-aar.md](build-android-aar.md)
- Get the tor sub-module: `git submodule update --init`
- Install Node packages: `yarn`
- Compile the Tor Android lib: `yarn install-tor-lib`
- Generate proto files: `yarn gen-proto`

To start the application:
- Run: `yarn start-metro`
- Run: `yarn mainnet-debug` or `yarn testnet-debug`

## Commit and Code-Style

Follow the code style of the file you are working in.
For commits, make descriptive and atomic git commits.

## License

MIT
