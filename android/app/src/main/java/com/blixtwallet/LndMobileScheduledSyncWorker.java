package com.blixtwallet;

import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.util.Log;
import java.util.EnumSet;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.ResolvableFuture;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ListenableWorker;
import androidx.work.WorkerParameters;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.protobuf.ByteString;
import io.grpc.LightningGrpc.Rpc;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteStatement;
import com.facebook.react.modules.storage.ReactDatabaseSupplier;
import com.facebook.react.modules.storage.AsyncLocalStorageUtil;

import com.hypertrack.hyperlog.HyperLog;

public class LndMobileScheduledSyncWorker extends ListenableWorker {
  private final String TAG = "LndScheduledSyncWorker";
  private final String HANDLERTHREAD_NAME = "blixt_lndmobile_sync";
  private ResolvableFuture future = ResolvableFuture.create();
  private Handler incomingHandler;
  private boolean lndMobileServiceBound = false;
  private Messenger messengerService; // The service
  private Messenger messenger; // Me
  private ReactDatabaseSupplier dbSupplier;
  // private enum WorkState {
  //   NOT_STARTED, BOUND, WALLET_UNLOCKED, WAITING_FOR_SYNC, DONE;
  //   public static final EnumSet<WorkState> ALL_OPTS = EnumSet.allOf(WorkState.class);
  //   public final int flag;

  //   WorkState() {
  //     this.flag = 1 << this.ordinal();
  //   }
  // }
  // WorkState currentState = WorkState.NOT_STARTED;

  public LndMobileScheduledSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
    super(context, workerParams);
    dbSupplier = ReactDatabaseSupplier.getInstance(getApplicationContext());
  }

  @Override
  public ListenableFuture<Result> startWork() {
    HyperLog.i(TAG, "------------------------------------");
    HyperLog.i(TAG, "Starting scheduled sync work");
    HyperLog.i(TAG, "I am " + getApplicationContext().getPackageName());
    final String password = getWalletPassword();
    writeLastScheduledSyncAttemptToDb();

    // TODO(hsjoberg) use MSG_CHECKSTATUS instead
    if (checkLndProcessExists()) {
      HyperLog.i(TAG, "Lnd is already started, quitting job");
      future.set(Result.success());
      return future;
    }

    HandlerThread thread = new HandlerThread(HANDLERTHREAD_NAME) {
      @Override
      public void run() {
        incomingHandler = new Handler() {
          @Override
          public void handleMessage(Message msg) {
            HyperLog.d(TAG, "Handling new incoming message from LndMobileService, msg id: " + msg.what);
            HyperLog.v(TAG, msg.toString());
            Bundle bundle;

            switch (msg.what) {
              case LndMobileService.MSG_REGISTER_CLIENT_ACK:
                try {
                  HyperLog.i(TAG, "Sending MSG_START_LND request");
                  startLnd();
                } catch (Throwable t) {
                  t.printStackTrace();
                }
                break;
              case LndMobileService.MSG_START_LND_RESULT:
                HyperLog.i(TAG, "LndMobileService reports lnd is started. Sending UnlockWallet request");
                unlockWalletRequest(password);
                break;
              case LndMobileService.MSG_GRPC_COMMAND_RESULT:
                bundle = msg.getData();
                final byte[] response = bundle.getByteArray("response");
                final String method = bundle.getString("method");

                if (method.equals("UnlockWallet")) {
                  HyperLog.i(TAG, "Got MSG_GRPC_COMMAND_RESULT for UnlockWallet. Waiting for MSG_WALLETUNLOCKED before doing anything");
                  // getInfoRequest();
                } else if (method.equals("GetInfo")) {
                  try {
                    Rpc.GetInfoResponse res = Rpc.GetInfoResponse.parseFrom(response);
                    HyperLog.d(TAG, "GetInfo Response");
                    HyperLog.v(TAG, "blockHash" + res.getBlockHash());
                    HyperLog.d(TAG, "blockHeight: " + Integer.toString(res.getBlockHeight()));
                    HyperLog.i(TAG, "syncedToChain is " + Boolean.toString(res.getSyncedToChain()));

                    if (res.getSyncedToChain() == true) {
                      HyperLog.i(TAG, "Sync is done, letting lnd work for 30s before quitting");
                      writeLastScheduledSyncToDb();

                      Handler handler = new Handler();
                      handler.postDelayed(new Runnable() {
                        public void run() {
                          HyperLog.i(TAG, "Job is done. Quitting");
                          unbindLndMobileService();

                          future.set(Result.success());
                        }
                      }, 30000);
                    }
                    else {
                      HyperLog.i(TAG, "Sleeping 10s then checking again");
                      Handler handler = new Handler();
                      handler.postDelayed(new Runnable() {
                        public void run() {
                          getInfoRequest();
                        }
                      }, 10000);
                    }
                  } catch (Throwable t) {
                    t.printStackTrace();
                  }
                }
                else {
                  Log.w(TAG, "Got unexpected method in MSG_GRPC_COMMAND_RESULT from LndMobileService. " +
                             "Expected GetInfo or UnlockWallet, got " + method);
                }
                break;
              case LndMobileService.MSG_WALLETUNLOCKED:
                  HyperLog.i(TAG, "LndMobileService reports RPC server ready. Sending GetInfo request");
                  getInfoRequest();
                break;
              default:
                super.handleMessage(msg);
              }
            }
        };

        messenger = new Messenger(incomingHandler); // me
        bindLndMobileService();
      }
    };
    thread.run();

    return future;
  }

  private void startLnd() {
    try {
      Message message = Message.obtain(null, LndMobileService.MSG_START_LND, 0, 0);
      message.replyTo = messenger;
      Bundle bundle = new Bundle();
      bundle.putString("args", "--lnddir=" + getApplicationContext().getFilesDir().getPath());
      message.setData(bundle);
      messengerService.send(message);
    } catch (RemoteException e) {
      e.printStackTrace();
    }
  }

  private void unlockWalletRequest(String password) {
    try {
      Message message = Message.obtain(null, LndMobileService.MSG_GRPC_COMMAND, 0, 0);
      message.replyTo = messenger;
      Bundle bundle = new Bundle();
      bundle.putString("method", "UnlockWallet");
      bundle.putByteArray("payload", Rpc.UnlockWalletRequest.newBuilder().setWalletPassword(ByteString.copyFromUtf8(password)).build().toByteArray());
      message.setData(bundle);
      messengerService.send(message);
    } catch (RemoteException e) {
      e.printStackTrace();
    }
  }

  private void getInfoRequest() {
    try {
      Message message = Message.obtain(null, LndMobileService.MSG_GRPC_COMMAND, 0, 0);
      message.replyTo = messenger;
      Bundle getinfoBundle = new Bundle();
      getinfoBundle.putString("method", "GetInfo");
      getinfoBundle.putByteArray("payload", Rpc.GetInfoRequest.newBuilder().build().toByteArray());
      message.setData(getinfoBundle);
      messengerService.send(message);
    } catch (RemoteException e) {
      e.printStackTrace();
    }
  }

  private void bindLndMobileService() {
    getApplicationContext().bindService(
      new Intent(getApplicationContext(), LndMobileService.class),
      serviceConnection,
      Context.BIND_AUTO_CREATE
    );
    lndMobileServiceBound = true;
  }

  private void unbindLndMobileService() {
    if (lndMobileServiceBound) {
      if (messengerService != null) {
        try {
          Message message = Message.obtain(null, LndMobileService.MSG_UNREGISTER_CLIENT);
          message.replyTo = messenger;
          messengerService.send(message);
        } catch (RemoteException e) {
          HyperLog.e(TAG, "Unable to send unbind request to  ", e);
        }
      }

      getApplicationContext().unbindService(serviceConnection);
      lndMobileServiceBound = false;
      HyperLog.i(TAG, "Unbinding LndMobileService");
    }
  }

  private String getWalletPassword() {
    SQLiteDatabase db = dbSupplier.get();
    return AsyncLocalStorageUtil.getItemImpl(db, "walletPassword");
  }

  private void writeLastScheduledSyncAttemptToDb() {
    SQLiteDatabase db = dbSupplier.get();
    String key = "lastScheduledSyncAttempt";
    Long tsLong = System.currentTimeMillis() / 1000;
    String value = tsLong.toString();
    String sql = "INSERT OR REPLACE INTO catalystLocalStorage VALUES (?, ?);";
    SQLiteStatement statement = db.compileStatement(sql);
    try {
      db.beginTransaction();
      statement.clearBindings();
      statement.bindString(1, key);
      statement.bindString(2, value);
      statement.execute();
      db.setTransactionSuccessful();
    } catch (Exception e) {
      HyperLog.w(TAG, e.getMessage(), e);
    } finally {
      try {
        db.endTransaction();
      } catch (Exception e) {
        HyperLog.w(TAG, e.getMessage(), e);
      }
    }
  }

  private void writeLastScheduledSyncToDb() {
    SQLiteDatabase db = dbSupplier.get();
    String key = "lastScheduledSync";
    Long tsLong = System.currentTimeMillis() / 1000;
    String value = tsLong.toString();
    String sql = "INSERT OR REPLACE INTO catalystLocalStorage VALUES (?, ?);";
    SQLiteStatement statement = db.compileStatement(sql);
    try {
      db.beginTransaction();
      statement.clearBindings();
      statement.bindString(1, key);
      statement.bindString(2, value);
      statement.execute();
      db.setTransactionSuccessful();
    } catch (Exception e) {
      HyperLog.w(TAG, e.getMessage(), e);
    } finally {
      try {
        db.endTransaction();
      } catch (Exception e) {
        HyperLog.w(TAG, e.getMessage(), e);
      }
    }
  }

  private boolean checkLndProcessExists() {
    String packageName = getApplicationContext().getPackageName();
    ActivityManager am = (ActivityManager) getApplicationContext().getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      if (p.processName.equals(packageName + ":blixtLndMobile")) {
        HyperLog.d(TAG, packageName + ":blixtLndMobile pid: " + String.valueOf(p.pid));
        return true;
      }
    }
    return false;
  }

  private ServiceConnection serviceConnection = new ServiceConnection() {
    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        lndMobileServiceBound = true;
        messengerService = new Messenger(service);

        try {
            Message msg = Message.obtain(null,
                    LndMobileService.MSG_REGISTER_CLIENT);
            msg.replyTo = messenger;
            messengerService.send(msg);
        } catch (RemoteException e) {
          HyperLog.e(TAG, "Unable to send MSG_REGISTER_CLIENT to LndMobileService", e);
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName className) {
      messengerService = null;
      lndMobileServiceBound = false;
    }
  };
}
