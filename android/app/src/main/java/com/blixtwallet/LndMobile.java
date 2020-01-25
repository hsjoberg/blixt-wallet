package com.blixtwallet;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import android.Manifest;
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
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.EnumSet;

import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.permissions.PermissionsModule;

import com.facebook.react.modules.storage.ReactDatabaseSupplier;
import com.facebook.react.modules.storage.AsyncLocalStorageUtil;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;

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
        case LndMobileService.MSG_REGISTER_CLIENT_ACK: {
          final int request = msg.arg1;

          if (!requests.containsKey(request)) {
            // If request is -1,
            // we intentionally don't want to
            // Resolve the promise.
            if (request != -1) {
              HyperLog.e(TAG, "Unknown request: " + request);
            }
            return;
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
            HyperLog.w(TAG, "Unknown request: " + request);
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
  public void startLnd(Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    Message message = Message.obtain(null, LndMobileService.MSG_START_LND, req, 0);
    message.replyTo = messenger;

    Bundle bundle = new Bundle();
    bundle.putString("args", "--lnddir=" + getReactApplicationContext().getFilesDir().getPath());
    message.setData(bundle);

    try {
      lndMobileServiceMessenger.send(message);
    } catch (RemoteException e) {
      promise.reject(TAG, "Could not Send MSG_START_LND to LndMobileService", e);
    }
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
          "no-macaroons=1\n" +
          "maxbackoff=2s\n" +
          "nolisten=1\n" +
          "norest=1\n" +
          "sync-freelist=1\n" +
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
          "no-macaroons=1\n" +
          "maxbackoff=2s\n" +
          "nolisten=1\n" +
          "norest=1\n" +
          "sync-freelist=1\n" +
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
  public void DEBUG_deleteWallet(Promise promise) {
    String filename = getReactApplicationContext().getFilesDir().toString() + "/data/chain/bitcoin/" + BuildConfig.CHAIN + "/wallet.db";
    File file = new File(filename);
    promise.resolve(file.delete());
  }

  @ReactMethod
  public void DEBUG_deleteDatafolder(Promise promise) {
    String filename = getReactApplicationContext().getFilesDir().toString() + "/data/";
    File file = new File(filename);
    deleteRecursive(file);
    promise.resolve(null);
  }

  @ReactMethod
  public void deleteTLSCerts(Promise promise) {
    HyperLog.d(TAG, "Deleting lnd TLS certificates");

    String tlsKeyFilename = getReactApplicationContext().getFilesDir().toString() + "/tls.key";
    File tlsKeyFile = new File(tlsKeyFilename);
    boolean tlsKeyFileDeletion = tlsKeyFile.delete();
    HyperLog.d(TAG, "Delete: " + tlsKeyFilename.toString() + ": " + tlsKeyFileDeletion);

    String tlsCertFilename = getReactApplicationContext().getFilesDir().toString() + "/tls.cert";
    File tlsCertFile = new File(tlsCertFilename);
    boolean tlsCertFileDeletion = tlsCertFile.delete();
    HyperLog.d(TAG, "Delete: " + tlsCertFilename.toString() + ": " + tlsCertFileDeletion);

    promise.resolve(tlsKeyFileDeletion && tlsCertFileDeletion);
  }

  @ReactMethod
  public void sendCommand(String method, String payloadStr, final Promise promise) {
    int req = new Random().nextInt();
    requests.put(req, promise);

    HyperLog.d(TAG, "sendCommand() " + method);
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
    Message message = Message.obtain(null, LndMobileService.MSG_GRPC_STREAM_COMMAND, 0, 0);
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
                  "/BlixtWallet/channels-backup-" +
                  dateFormat.format(new Date()) +
                  ".bin";

    try (FileOutputStream stream = new FileOutputStream(path)) {
      stream.write(backups);
      Log.i(TAG, "Success " + path);
    } catch (Exception e) {
      Log.e(TAG, "Couldn't write " + path, e);
      promise.reject("Couldn't write: " + path, e.getMessage());
    }

    promise.resolve(path);
  }

  private interface RequestWriteExternalStoragePermissionCallback {
    void success(@Nullable Object value);
  }

  private void checkWriteExternalStoragePermission(@NonNull RequestWriteExternalStoragePermissionCallback successCallback,
                                                   @NonNull Runnable failCallback,
                                                   @NonNull Runnable failPermissionCheckcallback) {
    PermissionsModule permissions = new PermissionsModule(getReactApplicationContext());

    PermissionPromise requestPermissionPromise = new PermissionPromise() {
      @Override
      public void onSuccess(@Nullable Object value) {
        successCallback.success(value);
      }

      @Override
      public void onFail() {
        failCallback.run();
      }
    };

    PermissionPromise checkPermissionPromise = new PermissionPromise() {
      @Override
      void onSuccess(@Nullable Object value) {
        permissions.requestPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE, requestPermissionPromise);
      }

      @Override
      void onFail() {
        failPermissionCheckcallback.run();
      }
    };

    permissions.checkPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE, checkPermissionPromise);
  }
}

abstract class PermissionPromise implements Promise {
  abstract void onSuccess(@Nullable Object value);

  abstract void onFail();

  @Override
  public void resolve(@Nullable Object value) { onSuccess(value); }
  @Override
  public void reject(String code, String message) { onFail(); }
  @Override
  public void reject(String code, Throwable throwable) { onFail(); }
  @Override
  public void reject(String code, String message, Throwable throwable) { onFail(); }
  @Override
  public void reject(Throwable throwable) { onFail(); }
  @Override
  public void reject(Throwable throwable, WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, @NonNull WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, Throwable throwable, WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, String message, @NonNull WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String message) { onFail(); }
}
