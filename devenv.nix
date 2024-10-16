{ pkgs, lib, config, inputs, ... }:
{
  env.GREET = "devenv";
  env.YARN_CHECKSUM_BEHAVIOR = "reset";
  packages = [ pkgs.git pkgs.curl ];
  android = {
    enable = true;
    reactNative.enable = true;
    android-studio.enable = false;
  };
  languages.javascript.enable = true;
  languages.javascript.yarn.enable = true;
  languages.javascript.corepack.enable = true;
  languages.typescript.enable = true;

  scripts = {
    android-init.exec = ''
      node node_modules/react-native-turbo-lnd/src/fetch-lnd.js
      echo "sdk.dir=$ANDROID_HOME" > android/local.properties

      # Download the Lndmobile.aar file and place it in the directory (overwriting if it exists)
      curl -L "https://github.com/hsjoberg/blixt-wallet/releases/download/v0.7.0/Lndmobile.aar" -o android/app/lndmobile/Lndmobile.aar

      echo "Lndmobile.aar downloaded and placed in android/app/lndmobile/"
    '';

    android-unsigned-apk.exec = ''
      yarn android:mainnet-unsigned
    '';
  };
}
