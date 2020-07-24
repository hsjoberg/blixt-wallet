package com.blixtwallet.tor;

import com.blixtwallet.BuildConfig;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import com.msopentech.thali.android.toronionproxy.AndroidOnionProxyManager;
import com.msopentech.thali.android.toronionproxy.AndroidTorConfig;
import com.msopentech.thali.toronionproxy.OnionProxyManager;
import com.msopentech.thali.toronionproxy.TorConfig;

import java.io.File;
import com.hypertrack.hyperlog.HyperLog;

class BlixtTor extends ReactContextBaseJavaModule {
  private final String TAG = "BlixtTor";

  public BlixtTor(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  public String getName() {
    return "BlixtTor";
  }

  private OnionProxyManager getOnionProxyManager(String workingSubDirectoryName) {
    File installDir = new File(workingSubDirectoryName);

    TorConfig torConfig = AndroidTorConfig.createConfig(installDir, installDir, getReactApplicationContext());
    TorInstaller torInstaller = new TorInstaller(getReactApplicationContext(), installDir);

    return new AndroidOnionProxyManager(
      getReactApplicationContext(),
      torConfig,
      torInstaller,
      null,
      null,
      null
    );
  }

  private class TorStartTask extends android.os.AsyncTask<String, Integer, String> {
    Promise promise;

    public TorStartTask(Promise p) {
      promise = p;
    }

    @Override
    protected String doInBackground(String... strings) {
      try {
        String fileStorageLocation = getReactApplicationContext().getFilesDir().getPath() + "/torfiles";
        com.msopentech.thali.toronionproxy.OnionProxyManager onionProxyManager = getOnionProxyManager(fileStorageLocation);
        onionProxyManager.setup();
        //onionProxyManager.stop();
        onionProxyManager.getTorInstaller().updateTorConfigCustom(
          "RunAsDaemon 1\n" +
          "AvoidDiskWrites 1\n" +
          "ControlPort " + BlixtTorUtils.getControlPort() + "\n" +
          "SOCKSPort " + BlixtTorUtils.getSocksPort() + "\n" +
          "DNSPort 0\n" +
          "TransPort 0\n" +
          "CookieAuthentication 1\n" +
          "DisableNetwork 1\n" +
          "ControlPortWriteToFile " + fileStorageLocation + "/lib/tor/control.txt"+ "\n" +
          "CookieAuthFile " + fileStorageLocation + "/lib/tor/control_auth_cookie"+ "\n"
        );

        int totalSecondsPerTorStartup = 4 * 60;
        int totalTriesPerTorStartup = 5;

        boolean ok = onionProxyManager.startWithRepeat(totalSecondsPerTorStartup, totalTriesPerTorStartup, true);
        if (!ok) {
          HyperLog.i(TAG, "Couldn't start tor");
        }

        while (!onionProxyManager.isRunning()) {
          Thread.sleep(90);
        }
        HyperLog.i(TAG, "Tor initialized on port " + onionProxyManager.getIPv4LocalHostSocksPort());
        promise.resolve(onionProxyManager.getIPv4LocalHostSocksPort());
      }
      catch (Exception e) {
        e.printStackTrace();
        promise.reject(e);
      }
      return "done";
    }
  }

  @ReactMethod
  public void startTor(Promise promise) {
    new TorStartTask(promise).execute();
  }
}
