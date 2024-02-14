# Building Blixt Android for Windows:

## Pre-requisites:

Follow the setup guide on https://reactnative.dev/docs/environment-setup?guide=native&os=windows.
You can also install OpenJDK via `winget` instead of `chocolatey`.

## Guide

0. Install using `npm install --legacy-peer-deps` and do not use `yarn`. Yarn/Babel has some insane [bug](https://github.com/babel/babel/discussions/16255). Don't forget to do `npm run gen-proto` too after you've installed the packages.

1. Apply NativeBase patch in `package.json`:
`"native-base": "git+https://github.com/hsjoberg/NativeBase.git#e6ec53fd1f3242f4e3d6fdf619750a96e39537de",`

2. Download `protoc.exe` manually from https://github.com/protocolbuffers/protobuf/releases and link it via `path = ...` in `gradle.build` instead of `artifact`
https://github.com/hsjoberg/blixt-wallet/blob/7e21d898f0e76b19797b53907f029dba9b0bb767/android/app/build.gradle#L233-L235

The pre-compiled protoc binary from `com.google.protobuf:protobuf-gradle-plugin` is dependent on libstdc++-6.dll for whatever reason, making execution fail (unless you have it. I couldn't get it working).

3. Maybe needs attention: weird `react-native-reanimated` error https://github.com/software-mansion/react-native-reanimated/issues/5625 

4. Might need to do `npm start -- --port 8082` if something is hogging the default Metro port `8081`. `Ctrl+M` inside Blixt in the emulator. Change metro server to `<LAN IP>:8082`.

5. Happy Blixting!