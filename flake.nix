{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    android-nixpkgs = {
      url = "github:tadfisher/android-nixpkgs";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    {
      self,
      nixpkgs,
      android-nixpkgs,
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor =
        system:
        import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
      androidSdkFor =
        system:
        android-nixpkgs.sdk.${system} (
          sdkPkgs: with sdkPkgs; [
            build-tools-35-0-0
            build-tools-34-0-0
            cmdline-tools-latest
            platform-tools
            platforms-android-34
            platforms-android-35
            ndk-27-1-12297006
            cmake-3-22-1
          ]
        );
      mkShellFor =
        system:
        let
          pkgs = pkgsFor system;
          androidSdk = androidSdkFor system;
          # Base packages
          basePackages = with pkgs; [
            nodejs_22
            yarn
            androidSdk
            jdk17
            git
            curl
            unzip
            corepack
          ];
          # Create individual script files
          android-init = pkgs.writeScriptBin "android-init" ''
            #!${pkgs.stdenv.shell}
            # Install dependencies
            yarn install
            # Generate proto files
            yarn gen-proto
            node node_modules/react-native-turbo-lnd/src/fetch-lnd.js
            # Download the Lndmobile.aar file and place it in the directory
            curl -L "https://github.com/hsjoberg/blixt-wallet/releases/download/v0.7.0/Lndmobile.aar" \
              -o android/app/lndmobile/Lndmobile.aar
            echo "Lndmobile.aar downloaded and placed in android/app/lndmobile/"
          '';
          android-unsigned-apk = pkgs.writeScriptBin "android-unsigned-apk" ''
            #!${pkgs.stdenv.shell}
            yarn android:mainnet-unsigned
          '';
          # Shell hook
          commonHook = ''
            # Environment variables
            export GREET="devenv"
            export YARN_CHECKSUM_BEHAVIOR="reset"
            export LC_ALL=en_US.UTF-8
            export LANG=en_US.UTF-8
            # Enable corepack
            corepack enable
          '';
        in
        pkgs.mkShellNoCC {
          buildInputs = basePackages ++ [
            android-init
            android-unsigned-apk
          ];
          shellHook = commonHook;
        };
    in
    {
      devShells = forAllSystems (system: {
        default = mkShellFor system;
      });
    };
}
