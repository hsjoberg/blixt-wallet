package com.blixtwallet;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import android.Manifest;
import android.app.ActivityManager;
import android.os.Process;
import android.util.Base64;
import android.util.Log;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Environment;
import android.os.Message;
import android.os.Messenger;
import android.os.Handler;
import android.os.Bundle;
import android.os.IBinder;
import android.os.RemoteException;

import android.nfc.Tag;
import android.nfc.NfcAdapter;
import android.nfc.NdefMessage;
import android.nfc.tech.Ndef;
import android.nfc.NdefRecord;
import java.util.Arrays;
import java.io.UnsupportedEncodingException;

import java.io.PrintWriter;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.EnumSet;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.permissions.PermissionsModule;

import com.jakewharton.processphoenix.ProcessPhoenix;
import com.oblador.keychain.KeychainModule;

import com.hypertrack.hyperlog.HyperLog;

// TODO break this class up
class LndMobile extends ReactContextBaseJavaModule {
  private final String TAG = "LndMobile";
  Messenger messenger;
  private boolean lndMobileServiceBound = false;
  private Messenger lndMobileServiceMessenger; // The service
  private HashMap<Integer, Promise> requests = new HashMap<>();

  public enum LndStatus {
      SERVICE_BOUND, PROCESS_STARTED, WALLET_UNLOCKED;
      public static final EnumSet<LndStatus> ALL_OPTS = EnumSet.allOf(LndStatus.class);
      public final int flag;

      LndStatus() {
        this.flag = 1 << this.ordinal();
      }
  }

  @Override
  public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put("STATUS_SERVICE_BOUND", LndStatus.SERVICE_BOUND.flag);
    constants.put("STATUS_PROCESS_STARTED", LndStatus.PROCESS_STARTED.flag);
    constants.put("STATUS_WALLET_UNLOCKED", LndStatus.WALLET_UNLOCKED.flag);

    return constants;
  }

  class IncomingHandler extends Handler {

    @Override
    public void handleMessage(Message msg) {
      HyperLog.d(TAG, "New incoming message from LndMobileService, msg id: " + msg.what);
      Bundle bundle = msg.getData();

      switch (msg.what) {
        case LndMobileService.MSG_GRPC_COMMAND_RESULT:
        case LndMobileService.MSG_START_LND_RESULT:
        case LndMobileService.MSG_REGISTER_CLIENT_ACK:
        case LndMobileService.MSG_STOP_LND_RESULT: {
          final int request = msg.arg1;

          if (!requests.containsKey(request)) {
            // If request is -1,
            // we intentionally don't want to
            // Resolve the promise.
            if (request != -1) {
              HyperLog.e(TAG, "Unknown request: " + request + " for " + msg.what);
            }
            return; // !
          }

          final Promise promise = requests.remove(request);

          if (bundle.containsKey("error_code")) {
            HyperLog.e(TAG, "ERROR" + msg);
            final String errorCode = bundle.getString("error_code");
            final String errorDescription = bundle.getString("error_desc");
            promise.reject(errorCode, errorDescription);
            return;
          }

          final byte[] bytes = (byte[]) bundle.get("response");
          String b64 = "";

          if (bytes != null && bytes.length > 0) {
            b64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
          }

          WritableMap params = Arguments.createMap();
          params.putString("data", b64);
          promise.resolve(params);
          break;
        }
        case LndMobileService.MSG_GRPC_STREAM_RESULT: {
          // TODO handle when error is returned
          final byte[] bytes = (byte[]) bundle.get("response");
          final String method = (String) bundle.get("method");

          String b64 = "";

          if (bytes != null && bytes.length > 0) {
            b64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
          }

          WritableMap params = Arguments.createMap();
          params.putString("data", b64);

          getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(method, params);
          break;
        }
        case LndMobileService.MSG_CHECKSTATUS_RESPONSE: {
          final int request = msg.arg1;

          if (!requests.containsKey(request)) {
            HyperLog.e(TAG, "Unknown request: " + request + " for " + msg.what);
            return;
          }

          final Promise promise = requests.remove(request);
          int flags = msg.arg2;
          promise.resolve(flags);
          break;
        }
        case LndMobileService.MSG_WALLETUNLOCKED: {
          final int request = msg.arg1;
          final Promise promise = requests.remove(request);
          if (promise != null) {
            promise.resolve(null);
          }

          getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("WalletUnlocked", null);
          break;
        }
        case LndMobileService.MSG_GRPC_STREAM_STARTED: {
          final int request = msg.arg1;
          final Promise promise = requests.remove(request);
          if (promise != null) {
            promise.resolve("done");
          }
          break;
        }
      }
    }
  }

  class LndMobileServiceConnection implements ServiceConnection {
    private int request;

    LndMobileServiceConnection(int request) {
      this.request = request;
    }

    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
      HyperLog.i(TAG, "Service attached");
      HyperLog.i(TAG, "Request = " + request);
      lndMobileServiceBound = true;
      lndMobileServiceMessenger = new Messenger(service);

      try {
        Message msg = Message.obtain(null, LndMobileService.MSG_REGISTER_CLIENT, request, 0);
        msg.replyTo = messenger;
        lndMobileServiceMessenger.send(msg);
      } catch (RemoteException e) {
        // In this case the service has crashed before we could even
        // do anything with it; we can count on soon being
        // disconnected (and then reconnected if it can be restarted)
        // so there is no need to do anything here.
        Log.e(TAG, "LndMobileServiceConnection:onServiceConnected exception");
        Log.e(TAG, e.getMessage());
      }
    }

    @Override
    public void onServiceDisconnected(ComponentName className) {
      // This is called when the connection with the service has been
      // unexpectedly disconnected -- that is, its process crashed.
      lndMobileServiceMessenger = null;
      lndMobileServiceBound = false;
      HyperLog.e(TAG, "Service disconnected");
    }
  }

  private LndMobileServiceConnection lndMobileServiceConnection;

  public LndMobile(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "LndMobile";
  }

  @ReactMethod
  public void init(Promise promise) {
    if (!lndMobileServiceBound) {
      int req = new Random().nextInt();
      requests.put(req, promise);

      lndMobileServiceConnection = new LndMobileServiceConnection(req);
      messenger = new Messenger(new IncomingHandler()); // me

      getReactApplicationContext().bindService(
        new Intent(getReactApplicationContext(), LndMobileService.class),
        lndMobileServiceConnection,
        Context.BIND_AUTO_CREATE
      );

      lndMobileServiceBound = true;

      HyperLog.i(TAG, "LndMobile initialized");

      // Note: Promise is returned from MSG_REGISTER_CLIENT_ACK message from LndMobileService
    } else {
      promise.resolve(0);
    }
  }

  // TODO unbind LndMobileService?

  @ReactMethod
  public void checkStatus(Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    Message message = Message.obtain(null, LndMobileService.MSG_CHECKSTATUS, req, 0);
    message.replyTo = messenger;

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_CHECKSTATUS to LndMobileService", e);
    }
  }

  @ReactMethod
  public void startLnd(boolean torEnabled, Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    Message message = Message.obtain(null, LndMobileService.MSG_START_LND, req, 0);
    message.replyTo = messenger;

    Bundle bundle = new Bundle();

    String params = "--lnddir=" + getReactApplicationContext().getFilesDir().getPath();
    if (torEnabled) {
      int socksPort = 9070;
      int controlPort = 9071;
      if (BuildConfig.CHAIN.equals("testnet")) {
        socksPort += 10;
        controlPort += 10;
      }
      if (BuildConfig.DEBUG) {
        socksPort += 100;
        controlPort += 100;
      }
      params += " --tor.active --tor.socks=127.0.0.1:" + socksPort + " --tor.control=127.0.0.1:" + controlPort;
    }
    bundle.putString(
      "args",
      params
    );
    message.setData(bundle);

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_START_LND to LndMobileService", e);
    }
  }

  @ReactMethod
  public void stopLnd(Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    Message message = Message.obtain(null, LndMobileService.MSG_STOP_LND, req, 0);
    message.replyTo = messenger;

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_STOP_LND to LndMobileService", e);
    }
  }

  @ReactMethod
  public void killLnd(Promise promise) {
    killLndProcess();
    promise.resolve(true);
  }

  private boolean killLndProcess() {
    String packageName = getReactApplicationContext().getPackageName();
    ActivityManager am = (ActivityManager) getCurrentActivity().getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      if (p.processName.equals(packageName + ":blixtLndMobile")) {
        HyperLog.i(TAG, "Killing " + packageName + ":blixtLndMobile with pid: " + String.valueOf(p.pid));
        Process.killProcess(p.pid);
        return true;
      }
    }
    return false;
  }

  @ReactMethod
  public void restartApp() {
    ProcessPhoenix.triggerRebirth(getReactApplicationContext());
  }

  @ReactMethod
  void writeConfigFile(Promise promise) {
    String filename = getReactApplicationContext().getFilesDir().toString() + "/lnd.conf";

    try {
      new File(filename).getParentFile().mkdirs();
      PrintWriter out = new PrintWriter(filename);

      if (BuildConfig.CHAIN.equals("mainnet")) {
        out.println(
          "[Application Options]\n" +
          "debuglevel=info\n" +
          "maxbackoff=2s\n" +
          "nolisten=1\n" +
          "norest=1\n" +
          "sync-freelist=1\n" +
          "accept-keysend=1\n" +
          "\n" +
          "[Routing]\n" +
          "routing.assumechanvalid=1\n" +
          "\n" +
          "[Bitcoin]\n" +
          "bitcoin.active=1\n" +
          "bitcoin.mainnet=1\n" +
          "bitcoin.node=neutrino\n" +
          "\n" +
          "[Neutrino]\n" +
          "neutrino.connect=btcd-mainnet.lightning.computer\n" +
          "neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json\n" +
          "\n" +
          "[autopilot]\n" +
          "autopilot.active=0\n" +
          "autopilot.private=1\n" +
          "autopilot.minconfs=1\n" +
          "autopilot.conftarget=3\n" +
          "autopilot.allocation=1.0\n" +
          "autopilot.heuristic=externalscore:0.95\n" +
          "autopilot.heuristic=preferential:0.05\n"
        );
      } else if (BuildConfig.CHAIN.equals("testnet")) {
        out.println(
          "[Application Options]\n" +
          "debuglevel=info\n" +
          "maxbackoff=2s\n" +
          "nolisten=1\n" +
          "norest=1\n" +
          "sync-freelist=1\n" +
          "accept-keysend=1\n" +
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
          "neutrino.connect=btcd-testnet.lightning.computer\n" +
          "neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json\n" +
          "\n" +
          "[autopilot]\n" +
          "autopilot.active=0\n" +
          "autopilot.private=1\n" +
          "autopilot.minconfs=1\n" +
          "autopilot.conftarget=3\n" +
          "autopilot.allocation=1.0\n" +
          "autopilot.heuristic=externalscore:0.95\n" +
          "autopilot.heuristic=preferential:0.05\n"
        );
      } else if (BuildConfig.CHAIN.equals("regtest")) {
        out.println(
          "[Application Options]\n" +
          "debuglevel=info\n" +
          "maxbackoff=2s\n" +
          "nolisten=1\n" +
          "norest=1\n" +
          "sync-freelist=1\n" +
          "accept-keysend=1\n" +
          "\n" +
          "[Routing]\n" +
          "routing.assumechanvalid=1\n" +
          "\n" +
          "[Bitcoin]\n" +
          "bitcoin.active=1\n" +
          "bitcoin.regtest=1\n" +
          "bitcoin.node=bitcoind\n" +
          "\n" +
          "[Bitcoind]\n" +
          "bitcoind.rpchost=192.168.1.109:18443\n" +
          "bitcoind.rpcuser=polaruser\n" +
          "bitcoind.rpcpass=polarpass\n" +
          "bitcoind.zmqpubrawblock=192.168.1.109:28334\n" +
          "bitcoind.zmqpubrawtx=192.168.1.109:29335\n" +
          "\n" +
          "[autopilot]\n" +
          "autopilot.active=0\n" +
          "autopilot.private=1\n" +
          "autopilot.minconfs=1\n" +
          "autopilot.conftarget=3\n" +
          "autopilot.allocation=1.0\n" +
          "autopilot.heuristic=externalscore:0.95\n" +
          "autopilot.heuristic=preferential:0.05\n"
        );
      }

      out.close();
      HyperLog.d(TAG, "Saved lnd config: " + filename);
    } catch (Exception e) {
      HyperLog.e(TAG, "Couldn't write " + filename, e);
      promise.reject("Couldn't write: " + filename, e);
      return;
    }

    promise.resolve("File written: " + filename);
  }

  void deleteRecursive(File fileOrDirectory) {
    if (fileOrDirectory.isDirectory()) {
      for (File child : fileOrDirectory.listFiles()) {
        deleteRecursive(child);
      }
    }

    HyperLog.d(TAG, "Delete file " + fileOrDirectory.getName() + " : " + fileOrDirectory.delete());
  }

  @ReactMethod
  public void DEBUG_getWalletPasswordFromKeychain(Promise promise) {
    KeychainModule keychain = new KeychainModule(getReactApplicationContext());

    WritableMap keychainOptions = Arguments.createMap();
    WritableMap keychainOptionsAuthenticationPrompt = Arguments.createMap();
    keychainOptionsAuthenticationPrompt.putString("title", "Authenticate to retrieve secret");
    keychainOptionsAuthenticationPrompt.putString("cancel", "Cancel");
    keychainOptions.putMap("authenticationPrompt", keychainOptionsAuthenticationPrompt);

    keychain.getInternetCredentialsForServer("password", keychainOptions, new PromiseWrapper() {
      @Override
      public void onSuccess(@Nullable Object value) {
        if (value != null) {
          promise.resolve(((ReadableMap) value).getString("password"));
          return;
        }
        promise.reject("fail2");
      }

      @Override
      public void onFail(Throwable throwable) {
        Log.d(TAG, "error", throwable);
        promise.reject(throwable.getMessage());
      }
    });
  }

  @ReactMethod
  public void DEBUG_deleteWallet(Promise promise) {
    HyperLog.i(TAG, "DEBUG deleting wallet");
    String filename = getReactApplicationContext().getFilesDir().toString() + "/data/chain/bitcoin/" + BuildConfig.CHAIN + "/wallet.db";
    File file = new File(filename);
    promise.resolve(file.delete());
  }

  @ReactMethod
  public void DEBUG_deleteDatafolder(Promise promise) {
    HyperLog.i(TAG, "DEBUG deleting data folder");
    String filename = getReactApplicationContext().getFilesDir().toString() + "/data/";
    File file = new File(filename);
    deleteRecursive(file);
    promise.resolve(null);
  }

  @ReactMethod
  public void deleteTLSCerts(Promise promise) {
    HyperLog.i(TAG, "Deleting lnd TLS certificates");

    String tlsKeyFilename = getReactApplicationContext().getFilesDir().toString() + "/tls.key";
    File tlsKeyFile = new File(tlsKeyFilename);
    boolean tlsKeyFileDeletion = tlsKeyFile.delete();
    HyperLog.i(TAG, "Delete: " + tlsKeyFilename.toString() + ": " + tlsKeyFileDeletion);

    String tlsCertFilename = getReactApplicationContext().getFilesDir().toString() + "/tls.cert";
    File tlsCertFile = new File(tlsCertFilename);
    boolean tlsCertFileDeletion = tlsCertFile.delete();
    HyperLog.i(TAG, "Delete: " + tlsCertFilename.toString() + ": " + tlsCertFileDeletion);

    promise.resolve(tlsKeyFileDeletion && tlsCertFileDeletion);
  }

  @ReactMethod
  public void sendCommand(String method, String payloadStr, final Promise promise) {
    HyperLog.d(TAG, "sendCommand() " + method);
    int req = new Random().nextInt();
    requests.put(req, promise);

    Message message = Message.obtain(null, LndMobileService.MSG_GRPC_COMMAND, req, 0);
    message.replyTo = messenger;

    Bundle bundle = new Bundle();
    bundle.putString("method", method);
    bundle.putByteArray("payload", Base64.decode(payloadStr, Base64.NO_WRAP));
    message.setData(bundle);

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_GRPC_COMMAND to LndMobileService", e);
    }
  }

  @ReactMethod
  public void sendStreamCommand(String method, String payloadStr, boolean streamOnlyOnce, Promise promise) {
    HyperLog.d(TAG, "sendStreamCommand() " + method);
    int req = new Random().nextInt();
    requests.put(req, promise);

    Message message = Message.obtain(null, LndMobileService.MSG_GRPC_STREAM_COMMAND, req, 0);
    message.replyTo = messenger;

    Bundle bundle = new Bundle();
    bundle.putString("method", method);
    bundle.putByteArray("payload", Base64.decode(payloadStr, Base64.NO_WRAP));
    bundle.putBoolean("stream_only_once", streamOnlyOnce);
    message.setData(bundle);

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_GRPC_STREAM_COMMAND to LndMobileService", e);
    }

    promise.resolve("done");
  }

  @ReactMethod
  void unlockWallet(String password, Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    HyperLog.d(TAG, "unlockWallet()");
    Message message = Message.obtain(null, LndMobileService.MSG_UNLOCKWALLET, req, 0);
    message.replyTo = messenger;

    Bundle bundle = new Bundle();
    bundle.putString("password", password);
    message.setData(bundle);

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_UNLOCKWALLET to LndMobileService", e);
    }
  }


  @ReactMethod
  void initWallet(ReadableArray seed, String password, int recoveryWindow, String channelBackupsBase64, Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    ArrayList<String> seedList = new ArrayList();
    for (int i = 0; i < seed.size(); i++) {
      if (seed.getType(i) == ReadableType.String) {
        seedList.add(seed.getString(i));
      }
      else {
        HyperLog.w(TAG, "InitWallet: Got non-string in seed array");
      }
    }

    HyperLog.d(TAG, "initWallet()");
    Message message = Message.obtain(null, LndMobileService.MSG_INITWALLET, req, 0);
    message.replyTo = messenger;

    Bundle bundle = new Bundle();
    // TODO(hsjoberg): this could possibly be faster if we
    // just encode it to a bytearray using the grpc lib here,
    // instead of letting LndMobileService do that part
    bundle.putStringArrayList("seed", seedList);
    bundle.putString("password", password);
    bundle.putInt("recoveryWindow", recoveryWindow);
    bundle.putString("channelBackupsBase64", channelBackupsBase64);
    message.setData(bundle);

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_INITWALLET to LndMobileService", e);
    }
  }

  @ReactMethod
  public void saveLogs(Promise promise) {
    File file = HyperLog.getDeviceLogsInFile(getReactApplicationContext(), false);
    if (file != null && file.exists()) {
      promise.resolve(file.getAbsolutePath());
    }
    else {
      promise.reject("Fail saving log");
    }
  }

  @ReactMethod
  public void copyLndLog(Promise promise) {
    checkWriteExternalStoragePermission(
      (@Nullable Object value) -> {
        if (value.equals("granted")) {
          if (copyLndLogFile()) {
            promise.resolve("Done");
          }
          else {
            promise.reject("Error copying");
          }
        }
      },
      () -> {
        promise.reject("Request Error");
      },
      () -> {
        promise.reject("Permission Check Error");
      }
    );
  }

  public boolean copyLndLogFile() {
    File sourceLocation = new File(
      getReactApplicationContext().getFilesDir().toString() +
      "/logs/bitcoin/" +
      BuildConfig.CHAIN +
      "/lnd.log"
    );
    File targetDir = new File(
      Environment.getExternalStorageDirectory() +
      "/BlixtWallet"
    );
    File targetLocation = new File(targetDir.toString() + "/lnd-" + BuildConfig.CHAIN + (BuildConfig.DEBUG ? "-debug" : "") +  ".log");

    try {
      Log.e(TAG, targetLocation.toString());

      if (!targetDir.exists()) {
        if (!targetDir.mkdirs()) {
          throw new Error("Error creating dir");
        }
      }

      InputStream in = new FileInputStream(sourceLocation);
      OutputStream out = new FileOutputStream(targetLocation);

      byte[] buf = new byte[1024];
      int len;
      while ((len = in.read(buf)) > 0) {
        out.write(buf, 0, len);
      }
      in.close();
      out.close();

      return true;
    } catch (Throwable e) {
      Log.e(TAG, "copyLndLogFile() failed: " + e.getMessage() + " " +
                 "source: " + sourceLocation.toString() + "\n " +
                 "dest: " + targetDir.toString()
      );
      return false;
    }
  }

  @ReactMethod
  public void saveChannelsBackup(String base64Backups, Promise promise) {
    byte[] backups = Base64.decode(base64Backups, Base64.NO_WRAP);
    checkWriteExternalStoragePermission(
      (@Nullable Object value) -> {
        if (value.equals("granted")) {
          saveChannelBackupToFile(backups, promise);
        }
        else {
          promise.reject("You must grant access");
        }
      },
      () -> { promise.reject("Request Error"); },
      () -> { promise.reject("Check Error"); }
    );
  }

  private void saveChannelBackupToFile(byte[] backups, Promise promise) {
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss") ;
    String path = Environment.getExternalStorageDirectory() +
                  "/Blixt-Wallet" +
                  (BuildConfig.CHAIN.equals("testnet") ? "-testnet" : "") +
                  (BuildConfig.DEBUG ? "-debug" : "");
    String file = path +
                  "/channels-backup-" +
                  dateFormat.format(new Date()) + ".bin";

    try {
      File dir = new File(path);
      if (!dir.exists()) {
        dir.mkdirs();
      }
    } catch (Exception e) {
      Log.e(TAG, "Couldn't create folder " + path, e);
      promise.reject("Couldn't create folder: " + path, e.getMessage());
    }

    try (FileOutputStream stream = new FileOutputStream(file)) {
      stream.write(backups);
      Log.i(TAG, "Success " + file);
    } catch (Exception e) {
      Log.e(TAG, "Couldn't write " + file, e);
      promise.reject("Couldn't write: " + file, e.getMessage());
    }

    promise.resolve(file);
  }

  private interface RequestWriteExternalStoragePermissionCallback {
    void success(@Nullable Object value);
  }

  private void checkWriteExternalStoragePermission(@NonNull RequestWriteExternalStoragePermissionCallback successCallback,
                                                   @NonNull Runnable failCallback,
                                                   @NonNull Runnable failPermissionCheckcallback) {
    PermissionsModule permissions = new PermissionsModule(getReactApplicationContext());

    PromiseWrapper requestPromiseWrapper = new PromiseWrapper() {
      @Override
      public void onSuccess(@Nullable Object value) {
        successCallback.success(value);
      }

      @Override
      public void onFail(Throwable throwable) {
        failCallback.run();
      }
    };

    PromiseWrapper checkPromiseWrapper = new PromiseWrapper() {
      @Override
      void onSuccess(@Nullable Object value) {
        permissions.requestPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE, requestPromiseWrapper);
      }

      @Override
      void onFail(Throwable throwable) {
        failPermissionCheckcallback.run();
      }
    };

    permissions.checkPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE, checkPromiseWrapper);
  }

  @ReactMethod
  public void getIntentStringData(Promise promise) {
    String sharedText = getReactApplicationContext()
      .getCurrentActivity().getIntent().getStringExtra(Intent.EXTRA_TEXT);

    if (sharedText != null) {
      Log.d(TAG, sharedText);
      promise.resolve(sharedText);
    }
    else {
      Log.d(TAG, "sharedText null");
      promise.resolve(null);
    }
  }

  @ReactMethod
  public void getIntentNfcData(Promise promise) {
    // https://code.tutsplus.com/tutorials/reading-nfc-tags-with-android--mobile-17278
    Tag tag = getReactApplicationContext()
      .getCurrentActivity().getIntent().getParcelableExtra(NfcAdapter.EXTRA_TAG);
    if (tag == null) {
      promise.resolve(null);
      return;
    }

    Ndef ndef = Ndef.get(tag);
    if (ndef == null) {
      HyperLog.d(TAG, "NFC tag is not NDEF");
      promise.resolve(null);
    }

    NdefMessage ndefMessage = ndef.getCachedNdefMessage();

    NdefRecord[] records = ndefMessage.getRecords();
    if (records.length > 0) {
      // Get first record and ignore the rest
      NdefRecord record = records[0];
      if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN && Arrays.equals(record.getType(), NdefRecord.RTD_TEXT)) {
        /*
         * See NFC forum specification for "Text Record Type Definition" at 3.2.1
         *
         * http://www.nfc-forum.org/specs/
         *
         * bit_7 defines encoding
         * bit_6 reserved for future use, must be 0
         * bit_5..0 length of IANA language code
        */
        byte[] payload = record.getPayload();

        // Get the Text Encoding
        String textEncoding = ((payload[0] & 128) == 0) ? "UTF-8" : "UTF-16";

        // Get the Language Code
        int languageCodeLength = payload[0] & 0063;

        // String languageCode = new String(payload, 1, languageCodeLength, "US-ASCII");
        // e.g. "en"

        try {
          String s = new String(payload, languageCodeLength + 1, payload.length - languageCodeLength - 1, textEncoding);
          promise.resolve(s);
          return;
        } catch (UnsupportedEncodingException e) {
          HyperLog.e(TAG, "Error returning ndef data", e);
        }
      }
      else {
        HyperLog.d(TAG, "Cannot read NFC Tag Record");
      }
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void tailLog(Integer numberOfLines, Promise promise) {
    File file = new File(
      getReactApplicationContext().getFilesDir().toString() +
      "/logs/bitcoin/" +
      BuildConfig.CHAIN +
      "/lnd.log"
    );

    java.io.RandomAccessFile fileHandler = null;
    try {
      fileHandler = new java.io.RandomAccessFile(file, "r");
      long fileLength = fileHandler.length() - 1;
      StringBuilder sb = new StringBuilder();
      int line = 0;

      for(long filePointer = fileLength; filePointer != -1; filePointer--){
        fileHandler.seek( filePointer );
        int readByte = fileHandler.readByte();

        if (readByte == 0xA) {
          if (filePointer < fileLength) {
            line = line + 1;
          }
        } else if (readByte == 0xD) {
          if (filePointer < fileLength-1) {
              line = line + 1;
          }
        }
        if (line >= numberOfLines) {
          break;
        }
        sb.append((char) readByte);
      }

      String lastLine = sb.reverse().toString();
      promise.resolve(lastLine);
    } catch (java.io.FileNotFoundException e) {
      e.printStackTrace();
      promise.reject(e);
    } catch (java.io.IOException e) {
      e.printStackTrace();
      promise.reject(e);
    }
    finally {
      if (fileHandler != null) {
        try {
          fileHandler.close();
        } catch (java.io.IOException e) {}
      }
    }
  }

  @ReactMethod
  public void log(String type, String tag, String message) {
    String mainTag = "BlixtWallet";

    switch (type) {
      case "v":
        HyperLog.v(mainTag, "[" + tag + "] " + message);
      break;
      case "d":
        HyperLog.d(mainTag, "[" + tag + "] " + message);
      break;
      case "i":
        HyperLog.i(mainTag, "[" + tag + "] " + message);
      break;
      case "w":
        HyperLog.w(mainTag, "[" + tag + "] " + message);
      break;
      case "e":
        HyperLog.e(mainTag, "[" + tag + "] " + message);
      break;
      default:
        HyperLog.v(mainTag, "[unknown msg type][" + tag + "] " + message);
      break;
    }
  }
}
