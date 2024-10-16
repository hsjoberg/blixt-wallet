# Blixt Lightning Wallet

<a href="https://play.google.com/apps/testing/com.blixtwallet"><img alt="Get it on Google Play" height="52" src="https://blixtwallet.github.io/assets/images/google-play-badge-2.png" /></a>&nbsp;
<a href="https://testflight.apple.com/join/EXvGhRzS"><img alt="Download on the App Store" height="52" src="https://blixtwallet.github.io/assets/images/appstore-badge.svg" /></a>&nbsp;
<a href="https://t.me/BlixtWallet"><img height="52" src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" /></a>

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
- [x] Channel backup to Google Drive (Android) and iCloud (iOS)
- [x] [WebLN](https://webln.dev/) browser
- [x] Support for [Multi-Part Payments (MPP)](https://lightning.engineering/posts/2020-05-07-mpp/)
- [x] Integrated Tor support
- [x] Sending to Lightning Address
- [ ] Automatically open channels when needed ([LSP](https://github.com/hsjoberg/dunder-lsp))
- [ ] Receiving via Lightning Address by [Lightning Box](https://github.com/hsjoberg/lightning-box)
- [ ] NFC

## Known Bugs

The wallet uses lnd that is young and might have bugs. Check [lnd bug list here](https://github.com/lightningnetwork/lnd/issues?q=is%3Aissue+is%3Aopen+label%3Abug).

## Translation

You can contribute to the project by translating the app via [Transifex](https://www.transifex.com/blixt-wallet/blixt-wallet).

## Build Steps

Blixt targets three platforms right now: Web, Android and iOS.

The web target is only used for prototyping and is not a real wallet.

### Web

The easiest way get started is to build the web version, because you only need NodeJS and Yarn installed.
For the other targets you need to install their respective toolchains and also [golang](https://golang.org) &amp; [gomobile](https://pkg.go.dev/golang.org/x/mobile#section-readme) in order to build lnd for Blixt.

The web version is not used as a real wallet and is only for fast prototyping.
It's useful if you want to make design and GUI changes.

- Install [Node](https://nodejs.org) and [Yarn](https://classic.yarnpkg.com)
- Install Node packages: `yarn`
- Generate proto files: `yarn gen-proto`
- Start the web server: `yarn web`

### Android

- Install [Node](https://nodejs.org), [Yarn](https://yarnpkg.com/getting-started/install) and [Android Studio + Android SDK (including NDK)](https://developer.android.com/studio/)
- If needed, install an emulated android device inside Android Studio
- Download lnd binary from [from the latest Blixt Wallet release](https://github.com/hsjoberg/blixt-wallet/releases) and put it in `android/app/lndmobile`. Alternatively build lnd for Android by following the steps in [Build Lnd For mobile](https://github.com/lightningnetwork/lnd/tree/master/mobile)
- Install Node packages: `yarn`
- Generate proto files: `yarn gen-proto`

To start the application:
- Run: `yarn start-metro`
- Run: `yarn android:mainnet-debug` or `yarn android:testnet-debug`

For building Blixt Android on Windows, follow the additional build steps [here](./build-steps-android-windows.md).

### Android (Nix)

- Install [Nix](https://github.com/DeterminateSystems/nix-installer)
- Install [Devenv](https://devenv.sh/getting-started/)
- Install [Android Studio](https://developer.android.com/studio/) and start a simulator
- For more awesome experience you can also install [direnv](https://devenv.sh/automatic-shell-activation/) and enable automatic shell activation.
```
cd blixt-wallet

# Start the devenv shell (skip this if you installed direnv)
devenv shell

# Setup Android
android-init

# To build unsigned apk. (use sudo if you get a permission denied error)
android-unsigned-apk

## For local development:

# Start metro
yarn start

# Start blixt in regtest
yarn android:regtest-debug
```

### iOS

To build the iOS version, a computer running macOS is required. You also need an Apple Developer account, although you do not need to be enrolled in the Developer Program.

- Install [Xcode](https://developer.apple.com/xcode/), [Node](https://nodejs.org) and [Yarn](https://classic.yarnpkg.com/)
- Build lnd for iOS by following the steps in [Build Lnd for mobile](https://github.com/lightningnetwork/lnd/tree/master/mobile)
- Install Node packages: `yarn`
- Generate proto files: `yarn gen-proto`
- Install CocoaPods libs: `cd ios && pod install`
- Setup team signing:
  - Open `ios/BlixtWallet/BlixtWallet.xcworkspace` with Xcode
  - Login with your Apple Developer account if Xcode asks you to
  - Click on BlixtWallet in the left column
  - Click on the Signing &amp; Capabilities tab
  - Choose your Team in the dropdown and choose a new unique Bundle Identifier (cannot be the same as the ones released on the App Store). Do this for every configuration

To start the application:
- Run: `yarn start-metro`
- Run: `yarn ios:mainnet-debug --device "<your device name>"` or build from Xcode

### macOS

To build the macOS version, a computer running macOS is required.
- Install [Xcode](https://developer.apple.com/xcode/), [Node](https://nodejs.org) and [Yarn](https://classic.yarnpkg.com/)
- Build lnd for macOS by following the steps in [build-ios-framework.md](build-ios-framework.md)
  - Instead of running `make ios`, run `make macos` or `make apple`
- Install Node packages: `yarn`
- Generate proto files: `yarn gen-proto`
- Install CocoaPods libs: `cd macos && pod install`

To start the application:
- Run: `yarn start-metro`
- Build app from Xcode or run `yarn macos:mainnet-debug`

## Commit and Code-Style

Follow the code style of the file you are working in.
For commits, make descriptive and atomic git commits.

## License

MIT
