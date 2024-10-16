{ pkgs, lib, config, inputs, ... }:
{
  env.GREET = "devenv";
  env.YARN_CHECKSUM_BEHAVIOR = "reset";
  packages = [ pkgs.git ];
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
      yarn install
      yarn gen-proto
      node node_modules/react-native-turbo-lnd/src/fetch-lnd.js
      echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    '';
  };
}
