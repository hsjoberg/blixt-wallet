package com.blixtwallet;

import com.blixtwallet.BuildConfig;

public class BlixtTorUtils {
  public static int getSocksPort() {
    int socksPort = 9070;
    if (BuildConfig.CHAIN.equals("testnet")) {
      socksPort += 10;
    }
    if (BuildConfig.DEBUG) {
      socksPort += 100;
    }
    return socksPort;
  }

  public static int getControlPort() {
    int controlPort = 9071;
    if (BuildConfig.CHAIN.equals("testnet")) {
      controlPort += 10;
    }
    if (BuildConfig.DEBUG) {
      controlPort += 100;
    }
    return controlPort;
  }

  public static int getListenPort() {
    int listenPort = 9760;
    if (BuildConfig.CHAIN.equals("testnet")) {
      listenPort += 10;
    }
    if (BuildConfig.DEBUG) {
      listenPort += 100;
    }
    return listenPort;
  }
}
