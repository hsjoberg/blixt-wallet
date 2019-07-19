# Blixt Lightning Wallet

![App screenshot](app-screenshot.png)


## Build steps
* Install Go, Node, Yarn, react-native CLI, Android Studio and Android SDK
* If needed, install an emulated android device inside Android Studio
* Build lnd for Android by following the steps in [build-android-aar.md](build-android-aar.md)
* Install Node packages: `yarn`
* Build static JS proto files: `yarn gen-proto`
* Run: `react-native run-android` (make sure you either have an Android emulator running or a android device connected via USB)
