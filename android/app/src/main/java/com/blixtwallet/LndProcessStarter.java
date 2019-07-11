package com.blixtwallet;

import android.os.Build;
import java.io.PrintWriter;
import java.io.File;

import android.app.ActivityManager;
import android.content.Context;
import android.util.Log;
import android.content.Intent;

import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import com.google.gson.Gson;

class LndProcessStarter extends ReactContextBaseJavaModule {
  String TAG = "LndProcessStarter";
  Intent intentLnd;

  public LndProcessStarter(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "LndProcessStarter";
  }

  @ReactMethod
  void checkStatus(Promise promise) {
    promise.resolve(1);
  }

  @ReactMethod
  void writeConfigFile(Promise promise) {
    String filename = getReactApplicationContext().getFilesDir().toString() + "/lnd.conf";
    try {
      new File(filename).getParentFile().mkdirs();
      PrintWriter out = new PrintWriter(filename);
      out.println(
        "[Application Options]\n" +
        "debuglevel=info\n" +
        "nolisten=1\n" +
        //"maxpendingchannels=10\n" +
        //"maxlogfiles=3\n" +
        //"maxlogfilesize=10\n" +
        //"${profile}\n" +
        "\n" +
        "[Routing]\n" +
        "routing.assumechanvalid=1\n" +
        "\n" +
        "[Bitcoin]\n" +
        "bitcoin.active=1\n" +
        "bitcoin.testnet=1\n" +
        "bitcoin.node=neutrino\n" +
        "\n" +
        "[Neutrino]\n" +
        //"neutrino.addpeer=192.168.1.100:18333\n" +
        // "neutrino.addpeer=testnet4-btcd.zaphq.io\n" +
        "neutrino.connect=btcd-testnet.lightning.computer\n"
      );
      out.close();
      Log.i(TAG, "Success "+filename);
    } catch (Exception e) {
      Log.e(TAG, "Couldn't write " + filename);
      promise.reject("Couldn't write: " + filename + " \n" + e.getMessage());
    }
    promise.resolve("File written: " + filename);
  }

  /**
    * Resolves to true if process is starting or false if already started
    * Rejects if failed to start process
    */
  @ReactMethod
  void startProcess(Promise promise) {
    if (intentLnd != null) {
        if (checkLndProcessExists()) {
            Log.e(TAG, "Process exists");
            promise.resolve(false);
            return;
        }
        else {
            Log.e(TAG, "Process does not exist");
        }
    }

    try {
      intentLnd = new Intent(getReactApplicationContext(), LndProcessIntentService.class);

      final String args = "--lnddir=" + getReactApplicationContext().getFilesDir().getPath();
      intentLnd.putExtra("args", args);
      getReactApplicationContext().startService(intentLnd);
    }
    catch (Throwable t) {
      Log.e(TAG, "startProcess(): Fail " + t.getMessage());
      promise.reject(t.getMessage());
    }

    promise.resolve(true);
  }

  @ReactMethod
  void stopProcess(Promise promise) {
    // TODO check
    if (intentLnd != null) {
      getReactApplicationContext().stopService(intentLnd);
      intentLnd = null;
    }
  }

  private boolean checkLndProcessExists() {
    ActivityManager am = (ActivityManager) getReactApplicationContext().getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
        if (p.processName.equals("com.blixtwallet:blixtLndProcess")) {
            Log.i(TAG, "com.blixtwallet:blixtLndProcess pid: " + String.valueOf(p.pid));
            return true;
        }
    }
    return false;
}
}
