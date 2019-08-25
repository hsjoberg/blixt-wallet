# Blixt Lightning Wallet

![App screenshot](app-screenshot.png)

## Build steps
* Install Go, Node, Yarn, react-native CLI, Android Studio and Android SDK (using npm instead of yarn might work)
* If needed, install an emulated android device inside Android Studio
* Build lnd for Android by following the steps in [build-android-aar.md](build-android-aar.md)
* Install Node packages: `yarn`
* Generate proto files: `yarn gen-proto`
* Run: `react-native run-android --variant chaintestnetDebug` (make sure you either have an Android emulator running or an android device connected via USB)

## Commit and code-style
Follow the code style of the file you are working in.
For commits, make descriptive and atomic git commits.

## License
MIT
