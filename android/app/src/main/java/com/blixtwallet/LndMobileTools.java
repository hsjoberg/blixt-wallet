package com.blixtwallet;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.app.ActivityManager;
import android.database.sqlite.SQLiteDatabase;
import android.os.FileObserver;
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

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStreamReader;
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

import com.facebook.react.modules.storage.AsyncLocalStorageUtil;
import com.facebook.react.modules.storage.ReactDatabaseSupplier;
import com.jakewharton.processphoenix.ProcessPhoenix;
import com.oblador.keychain.KeychainModule;

import com.hypertrack.hyperlog.HyperLog;

import org.torproject.jni.TorService;

// TODO break this class up
class LndMobileTools extends ReactContextBaseJavaModule {
  final String TAG = "LndMobileTools";

  public LndMobileTools(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  private boolean getPersistentServicesEnabled(Context context) {
    ReactDatabaseSupplier dbSupplier = ReactDatabaseSupplier.getInstance(context);
    SQLiteDatabase db = dbSupplier.get();
    String persistentServicesEnabled = AsyncLocalStorageUtil.getItemImpl(db, "persistentServicesEnabled");
    if (persistentServicesEnabled != null) {
      return persistentServicesEnabled.equals("true");
    }
    HyperLog.w(TAG, "Could not find persistentServicesEnabled in asyncStorage");
    return false;
  }

  @Override
  public String getName() {
    return "LndMobileTools";
  }

  @ReactMethod
  void writeConfig(String config, Promise promise) {
    String filename = getReactApplicationContext().getFilesDir().toString() + "/lnd.conf";

    try {
      new File(filename).getParentFile().mkdirs();
      PrintWriter out = new PrintWriter(filename);
      out.println(config);
      out.close();
      HyperLog.d(TAG, "Saved lnd config: " + filename);
    } catch (Exception e) {
      HyperLog.e(TAG, "Couldn't write " + filename, e);
      promise.reject("Couldn't write: " + filename, e);
      return;
    }
    promise.resolve("File written: " + filename);
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
          "bitcoind.rpchost=192.168.1.113:18443\n" +
          "bitcoind.rpcuser=polaruser\n" +
          "bitcoind.rpcpass=polarpass\n" +
          "bitcoind.zmqpubrawblock=192.168.1.113:28334\n" +
          "bitcoind.zmqpubrawtx=192.168.1.113:29335\n" +
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

  @ReactMethod
  public void killLnd(Promise promise) {
    boolean result = killLndProcess();
    promise.resolve(result);
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
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("text/plain");
    intent.putExtra(Intent.EXTRA_TITLE, "lnd.log");
    getReactApplicationContext().getCurrentActivity().startActivityForResult(intent, MainActivity.INTENT_COPYLNDLOG);
    promise.resolve(true);
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

  private FileObserver logObserver;

  @ReactMethod
  public void observeLndLogFile(Promise p) {
    if (logObserver != null) {
      p.resolve(true);
      return;
    }

    File appDir = getReactApplicationContext().getFilesDir();

    final String logDir = appDir + "/logs/bitcoin/mainnet";
    final String logFile = logDir + "/lnd.log";

    FileInputStream stream = null;
    while (true) {
      try {
        stream = new FileInputStream(logFile);
      } catch (FileNotFoundException e) {
        File dir = new File(logDir);
        dir.mkdirs();
        File f = new File(logFile);
        try {
          f.createNewFile();
          continue;
        } catch (IOException e1) {
          e1.printStackTrace();
          return;
        }
      }
      break;
    }

    final InputStreamReader istream = new InputStreamReader(stream);
    final BufferedReader buf = new BufferedReader(istream);
    try {
      readToEnd(buf, false);
    } catch (IOException e) {
      e.printStackTrace();
      return;
    }

    logObserver = new FileObserver(logFile) {
      @Override
      public void onEvent(int event, String file) {
        if(event != FileObserver.MODIFY) {
          return;
        }
        try {
          readToEnd(buf, true);
        } catch (IOException e) {
          e.printStackTrace();
        }
      }
    };
    logObserver.startWatching();
    Log.i(TAG, "Started watching " + logFile);
    p.resolve(true);
  }

  private void readToEnd(BufferedReader buf, boolean emit) throws IOException {
    String s = "";
    while ( (s = buf.readLine()) != null ) {
      if (!emit) {
        continue;
      }
      getReactApplicationContext()
              .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
              .emit("lndlog", s);
    }
  }

  @ReactMethod
  public void saveChannelsBackup(String base64Backups, Promise promise) {
    MainActivity.tmpChanBackup = Base64.decode(base64Backups, Base64.NO_WRAP);
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");

    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("text/plain");
    intent.putExtra(Intent.EXTRA_TITLE, "blixt-channels-backup-" + dateFormat.format(new Date()) + ".bin");
    getReactApplicationContext().getCurrentActivity().startActivityForResult(intent, MainActivity.INTENT_EXPORTCHANBACKUP);
    promise.resolve(true);
  }

  @ReactMethod
  public void saveChannelBackupFile(Promise promise) {
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");

    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("text/plain");
    intent.putExtra(Intent.EXTRA_TITLE, "blixt-channels-backup-" + dateFormat.format(new Date()) + ".bin");
    getReactApplicationContext().getCurrentActivity().startActivityForResult(intent, MainActivity.INTENT_EXPORTCHANBACKUPFILE);
    promise.resolve(true);
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
  public void getTorEnabled(Promise promise) {
    android.database.sqlite.SQLiteDatabase db = com.facebook.react.modules.storage.ReactDatabaseSupplier.getInstance(getReactApplicationContext()).get();
    String torEnabled = AsyncLocalStorageUtil.getItemImpl(db, "torEnabled");
    if (torEnabled != null) {
      promise.resolve(torEnabled.equals("true"));
    }
    promise.reject(new Error(""));
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

  void deleteRecursive(File fileOrDirectory) {
    if (fileOrDirectory.isDirectory()) {
      for (File child : fileOrDirectory.listFiles()) {
        deleteRecursive(child);
      }
    }

    HyperLog.d(TAG, "Delete file " + fileOrDirectory.getName() + " : " + fileOrDirectory.delete());
  }

  @ReactMethod
  public void DEBUG_listProcesses(Promise promise) {
    String processes = "";

    String packageName = getReactApplicationContext().getPackageName();
    ActivityManager am = (ActivityManager) getCurrentActivity().getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      processes += p.processName + "\n";
    }

    promise.resolve(processes);
  }

  @ReactMethod
  public void checkLndProcessExist(Promise promise) {
    String packageName = getReactApplicationContext().getPackageName();
    ActivityManager am = (ActivityManager) getReactApplicationContext().getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      if (p.processName.equals(packageName + ":blixtLndMobile")) {
        HyperLog.d(TAG, packageName + ":blixtLndMobile pid: " + String.valueOf(p.pid));
        promise.resolve(true);
        return;
      }
    }
    promise.resolve(false);
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
  public void restartApp() {
    Intent stopTorIntent = new Intent(getReactApplicationContext(), TorService.class);
    stopTorIntent.setAction("org.torproject.android.intent.action.STOP");
    getReactApplicationContext().stopService(stopTorIntent);
    Intent stopLndIntent = new Intent(getReactApplicationContext(), LndMobileService.class);
    stopLndIntent.setAction("com.blixtwallet.android.intent.action.STOP");
    getReactApplicationContext().startService(stopLndIntent);
    ProcessPhoenix.triggerRebirth(getReactApplicationContext());
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

  private interface RequestWriteExternalStoragePermissionCallback {
    void success(@Nullable Object value);
  }
}
