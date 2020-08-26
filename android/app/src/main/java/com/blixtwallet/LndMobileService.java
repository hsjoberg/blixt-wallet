package com.blixtwallet;

import android.app.ActivityManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.os.Messenger;
import android.os.Process;
import android.os.RemoteException;
import android.util.Base64;
import android.util.Log;


import lndmobile.Callback;
import lndmobile.Lndmobile;
import lndmobile.RecvStream;
import lndmobile.SendStream;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

import lnrpc.Rpc;
import com.google.protobuf.ByteString;

import com.hypertrack.hyperlog.HyperLog;

public class LndMobileService extends Service {
  private static final String TAG = "LndMobileService";
  boolean lndStarted = false;
  boolean walletUnlocked = false;
  boolean subscribeInvoicesStreamActive = false;
  Set<String> streamsStarted = new HashSet<String>();

  Messenger messenger = new Messenger(new IncomingHandler());
  ArrayList<Messenger> mClients = new ArrayList<Messenger>();

  static final int MSG_REGISTER_CLIENT = 1;
  static final int MSG_REGISTER_CLIENT_ACK = 2;
  static final int MSG_UNREGISTER_CLIENT = 3;
  static final int MSG_START_LND = 4;
  static final int MSG_START_LND_RESULT = 5;
  static final int MSG_GRPC_COMMAND = 6;
  static final int MSG_GRPC_COMMAND_RESULT = 7;
  static final int MSG_GRPC_STREAM_COMMAND = 8;
  static final int MSG_GRPC_STREAM_RESULT = 9;
  static final int MSG_GRPC_STREAM_WRITE = 10;
  static final int MSG_CHECKSTATUS = 11;
  static final int MSG_CHECKSTATUS_RESPONSE = 12;
  static final int MSG_WALLETUNLOCKED = 13;
  static final int MSG_UNLOCKWALLET = 14;
  static final int MSG_INITWALLET = 15;
  static final int MSG_GRPC_STREAM_STARTED = 16;
  static final int MSG_STOP_LND = 17;
  static final int MSG_STOP_LND_RESULT = 18;
  static final int MSG_PING = 19;
  static final int MSG_PONG = 20;

  int unlockWalletRequest = -1;

  private Map<String, Method> syncMethods = new HashMap<>();
  private Map<String, Method> streamMethods = new HashMap<>();

  private static boolean isReceiveStream(Method m) {
    return m.toString().contains("RecvStream");
  }

  private static boolean isSendStream(Method m) {
      return m.toString().contains("SendStream");
  }

  private static boolean isStream(Method m) {
      return isReceiveStream(m) || isSendStream(m);
  }

  class IncomingHandler extends Handler {
      @Override
      public void handleMessage(Message msg) {
        HyperLog.d(TAG, "New incoming message from client, msg id: " + msg.what);
        Bundle bundle = msg.getData();
        final int request = msg.arg1;

        switch (msg.what) {
          case MSG_REGISTER_CLIENT:
            mClients.add(msg.replyTo);
            HyperLog.d(TAG, "Got register client " + msg.replyTo);
            sendToClient(msg.replyTo, Message.obtain(null, MSG_REGISTER_CLIENT_ACK, request, 0));
            //sendToClients(Message.obtain(null, MSG_REGISTER_CLIENT_ACK, request, 0));
            break;

          case MSG_UNREGISTER_CLIENT:
            HyperLog.d(TAG, "Got unregister client " + msg.replyTo);
            mClients.remove(msg.replyTo);
            break;

          case MSG_START_LND:
            HyperLog.d(TAG, "Got MSG_START_LND request");
            final String args = bundle.getString("args", "");
            startLnd(msg.replyTo, args, request);
            break;

          case MSG_GRPC_COMMAND:
          case MSG_GRPC_STREAM_COMMAND:
            final String method = bundle.getString("method");
            Method m = syncMethods.get(method);

            if (m == null) {
              m = streamMethods.get(method);

              if (m == null) {
                HyperLog.e(TAG, "Method " + method + " not found");
                return;
              }
            }

            boolean streamOnlyOnce = bundle.getBoolean("stream_only_once");

            if (msg.what == MSG_GRPC_STREAM_COMMAND) {
              if (streamOnlyOnce) {
                if (streamsStarted.contains(method)) {
                  HyperLog.d(TAG, "Attempting to stream " + method + " twice, not allowing");
                  return;
                }
              }

              streamsStarted.add(method);
            }

            final byte[] b = bundle.getByteArray("payload");

            try {
              m.invoke(
                null,
                b,
                msg.what == MSG_GRPC_COMMAND
                  ? new LndCallback(msg.replyTo, method, request)
                  : new LndStreamCallback(msg.replyTo, method)
              );

              if (msg.what == MSG_GRPC_STREAM_COMMAND) {
                Message message = Message.obtain(null, MSG_GRPC_STREAM_STARTED, request, 0);
                Bundle sendBundle = new Bundle();
                sendBundle.putString("method", method);
                message.setData(sendBundle);
                sendToClient(msg.replyTo, message);
              }

            } catch (IllegalAccessException e) {
              Log.e(TAG, "Could not invoke lndmobile method " + method, e);
              // TODO(hsjoberg) send error response to client?
            } catch (InvocationTargetException e) {
              Log.e(TAG, "Could not invoke lndmobile method " + method, e);
              // TODO(hsjoberg) send error response to client?
            }

            break;

          case MSG_CHECKSTATUS:
            // lndmobile.Lndmobile.getStatus(new lndmobile.LndStatusCallback() {
            //   @Override
            //   public void onResponse(boolean b, boolean b1) {
            //     HyperLog.i(TAG, "lnd started" + b);
            //     HyperLog.i(TAG, "wallet unlocked" + b1);

            //     int flags = 0;

            //     flags += LndMobile.LndStatus.SERVICE_BOUND.flag;

            //     if (b) {
            //       flags += LndMobile.LndStatus.PROCESS_STARTED.flag;
            //     }

            //     if (b1) {
            //       flags += LndMobile.LndStatus.WALLET_UNLOCKED.flag;
            //     }

            //     HyperLog.d(TAG, "MSG_CHECKSTATUS sending " + flags);
            //     sendToClient(msg.replyTo, Message.obtain(null, MSG_CHECKSTATUS_RESPONSE, request, flags));
            //   }
            // });

            int flags = 0;

            flags += LndMobile.LndStatus.SERVICE_BOUND.flag;

            if (lndStarted) {
              flags += LndMobile.LndStatus.PROCESS_STARTED.flag;
            }

            if (walletUnlocked) {
              flags += LndMobile.LndStatus.WALLET_UNLOCKED.flag;
            }

            HyperLog.d(TAG, "MSG_CHECKSTATUS sending " + flags);
            sendToClient(msg.replyTo, Message.obtain(null, MSG_CHECKSTATUS_RESPONSE, request, flags));
            //sendToClients(Message.obtain(null, MSG_CHECKSTATUS_RESPONSE, request, flags));
            break;

          case MSG_UNLOCKWALLET: {
            HyperLog.d(TAG, "Got MSG_UNLOCKWALLET");
            // unlockWalletRequest = request;

            String password = bundle.getString("password");

            lnrpc.Walletunlocker.UnlockWalletRequest.Builder unlockWallet = lnrpc.Walletunlocker.UnlockWalletRequest.newBuilder();
            unlockWallet.setWalletPassword(ByteString.copyFromUtf8(password));

            Lndmobile.unlockWallet(
              unlockWallet.build().toByteArray(),
              new LndCallback(msg.replyTo, "UnlockWallet", request)
            );
            break;
          }

          case MSG_INITWALLET:
            HyperLog.d(TAG, "Got MSG_INITWALLET");
            // Promise should be resolved
            // when the RPC ready callback
            // from LndMobile's start is called,
            // not when the InitWallet RPC call is done
            unlockWalletRequest = request;

            ArrayList<String> seed = bundle.getStringArrayList("seed");
            String password = bundle.getString("password");
            int recoveryWindow = bundle.getInt("recoveryWindow");
            String channelBackupsBase64 = bundle.getString("channelBackupsBase64");

            lnrpc.Walletunlocker.InitWalletRequest.Builder initWallet = lnrpc.Walletunlocker.InitWalletRequest.newBuilder();
            initWallet.addAllCipherSeedMnemonic(seed);
            initWallet.setWalletPassword(ByteString.copyFromUtf8(password));
            if (recoveryWindow != 0) {
              initWallet.setRecoveryWindow(recoveryWindow);
            }
            if (channelBackupsBase64 != null) {
              HyperLog.d(TAG, "--CHANNEL BACKUP RESTORE TEST--");
              initWallet.setChannelBackups(
                Rpc.ChanBackupSnapshot.newBuilder().setMultiChanBackup(
                  Rpc.MultiChanBackup.newBuilder().setMultiChanBackup(
                    ByteString.copyFrom(Base64.decode(channelBackupsBase64, Base64.DEFAULT))
                  )
                )
              );
            }

            Lndmobile.initWallet(
              initWallet.build().toByteArray(),
              new LndCallback(msg.replyTo, "InitWallet", -1)
            );
            break;

          case MSG_STOP_LND:
            HyperLog.d(TAG, "Got MSG_STOP_LND");
            stopLnd(msg.replyTo, request);
            break;

          case MSG_PING:
            HyperLog.d(TAG, "Got MSG_PING");
            sendToClient(msg.replyTo, Message.obtain(null, MSG_PONG, request, 0));
            break;

          default:
            super.handleMessage(msg);
        }
    }
  }

  class LndCallback implements lndmobile.Callback {
    private final Messenger recipient;
    private final String method;
    private final int request;

    LndCallback(Messenger recipient, String method, int request) {
      this.recipient = recipient;
      this.method = method;
      this.request = request;
    }

    @Override
    public void onError(Exception e) {
      HyperLog.e(TAG, "LndCallback onError() for " + method, e);

      Message msg = Message.obtain(null, MSG_GRPC_COMMAND_RESULT, request, 0);

      Bundle bundle = new Bundle();
      String message = e.getMessage();

      bundle.putString("method", method);

      if (message.contains("code = ")) {
        bundle.putString("error_code", message.substring(message.indexOf("code = ") + 7));
      }
      else {
        bundle.putString("error_code", "Error");
      }

      if (message.contains("desc = ")) {
        bundle.putString("error_desc", message.substring(message.indexOf("desc = ") + 7));
      }
      else {
        bundle.putString("error_desc", message);
      }

      bundle.putString("error", message);
      msg.setData(bundle);

      sendToClient(recipient, msg);
      //sendToClients(msg);
    }

    @Override
    public void onResponse(byte[] bytes) {
      HyperLog.d(TAG, "LndCallback onResponse() for " + method);

      Message msg = Message.obtain(null, MSG_GRPC_COMMAND_RESULT, request, 0);

      Bundle bundle = new Bundle();
      bundle.putByteArray("response", bytes);
      bundle.putString("method", method);
      msg.setData(bundle);

      sendToClient(recipient, msg);
      //sendToClients(msg);
    }
  }

  class LndStreamCallback implements lndmobile.RecvStream {
    private final Messenger recipient;
    private final String method;

    LndStreamCallback(Messenger recipient, String method) {
      this.recipient = recipient;
      this.method = method;
    }

    @Override
    public void onError(Exception e) {
      HyperLog.e(TAG, "LndStreamCallback onError() for " + method, e);
      HyperLog.e(TAG, e.getMessage());

      if (e.getMessage().contains("EOF")) {
        HyperLog.i(TAG, "Got EOF in LndStreamCallback for " + method);
      }

      Message msg = Message.obtain(null, MSG_GRPC_STREAM_RESULT, 0, 0);

      Bundle bundle = new Bundle();
      String message = e.getMessage();

      bundle.putString("method", method);

      if (message.indexOf("code = ") != -1) {
        bundle.putString("error_code", message.substring(message.indexOf("code = ") + 7));
      }
      else {
        bundle.putString("error_code", "Error");
      }

      if (message.indexOf("desc = ") != -1) {
        bundle.putString("error_desc", message.substring(message.indexOf("desc = ") + 7));
      }
      else {
        bundle.putString("error_desc", message);
      }

      msg.setData(bundle);

      sendToClient(recipient, msg);
      //sendToClients(msg);
    }

    @Override
    public void onResponse(byte[] bytes) {
      HyperLog.d(TAG, "onResponse() for " + method);
      Message msg = Message.obtain(null, MSG_GRPC_STREAM_RESULT, 0, 0);

      Bundle bundle = new Bundle();
      bundle.putByteArray("response", bytes);
      bundle.putString("method", method);
      msg.setData(bundle);

      sendToClient(recipient, msg);
      //sendToClients(msg);
    }
  }

  void startLnd(Messenger recipient, String args, int request) {
    HyperLog.d(TAG, "startLnd(): Starting lnd");
    Runnable startLnd = new Runnable() {

      @Override
      public void run() {
        Lndmobile.start(args, new lndmobile.Callback() {

          @Override
          public void onError(Exception e) {
            HyperLog.e(TAG, "Could not invoke Lndmobile.start()", e);

            Message msg = Message.obtain(null, MSG_START_LND_RESULT, request, 0);

            Bundle bundle = new Bundle();
            bundle.putString("error_code", "Lnd Startup Error");
            bundle.putString("error_desc", e.toString());
            msg.setData(bundle);

            sendToClient(recipient, msg);
            // sendToClients(msg);
          }

          @Override
          public void onResponse(byte[] bytes) {
            lndStarted = true;
            Message msg = Message.obtain(null, MSG_START_LND_RESULT, request, 0);

            Bundle bundle = new Bundle();
            bundle.putByteArray("response", bytes);
            msg.setData(bundle);

            sendToClient(recipient, msg);
            // sendToClients(msg);
          }
        }, new lndmobile.Callback() {

          @Override
          public void onError(Exception e) {
            HyperLog.e(TAG, "wallet unlock onError callback", e);
          }

          @Override
          public void onResponse(byte[] bytes) {
            HyperLog.i(TAG, "wallet unlock onResponse callback");
            walletUnlocked = true;

            Message msg = Message.obtain(null, MSG_WALLETUNLOCKED, unlockWalletRequest, 0);

            Bundle bundle = new Bundle();
            bundle.putByteArray("response", bytes);
            msg.setData(bundle);

            sendToClient(recipient, msg);
          }
        });
      }
    };

    new Thread(startLnd).start();
  }

  void sendToClient(Messenger reciever, Message msg) {
    final int i = mClients.indexOf(reciever);
    if (i == -1) {
      HyperLog.w(TAG, "Warning, could not find recipient to send message to");
      return;
    }
    try {
      mClients.get(i).send(msg);
    } catch(RemoteException e) {
      mClients.remove(i);
    }
  }

  void sendToClients(Message msg) {
    for (int i = mClients.size() - 1; i >= 0; i--) {
      try {
          mClients.get(i).send(msg);
      } catch (RemoteException e) {
          mClients.remove(i);
      }
    }
  }

  @Override
  public IBinder onBind(Intent intent) {
    HyperLog.v(TAG, "onBind()");
    return messenger.getBinder();
  }

  @Override
  public boolean onUnbind(Intent intent) {
    HyperLog.v(TAG, "onUnbind()");

    if (mClients.isEmpty()) {
      HyperLog.i(TAG, "Last client unbound. Checking if lnd is alive and stopping it.");

      if (checkLndProcessExists()) {
        HyperLog.i(TAG, "Lnd exists, attempting to stop it");
        stopLnd(null, -1);
        try {
          Thread.sleep(2000);
        } catch (InterruptedException e) {}
        killLndProcess();
      }
    }

    lndStarted = false;
    walletUnlocked = false;

    return false;
  }

  @Override
  public void onRebind(Intent intent) {
    HyperLog.v(TAG, "onRebind()");
    super.onRebind(intent);
  }

  public LndMobileService() {
    Method[] methods = Lndmobile.class.getDeclaredMethods();

    for (Method m : methods) {
      String name = m.getName();
      name = name.substring(0, 1).toUpperCase() + name.substring(1);

      if (isStream(m)) {
        streamMethods.put(name, m);
      } else {
        syncMethods.put(name, m);
      }
    }

    /*if (checkLndProcessExists()) {
      HyperLog.w(TAG, "WARNING: Found lnd process while in LndMobileService constructor.");
      HyperLog.w(TAG, "Going to kill lnd process");
      killLndProcess();
    }*/
  }

  private boolean checkLndProcessExists() {
    String packageName = getApplicationContext().getPackageName();
    ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      if (p.processName.equals(packageName + ":blixtLndMobile")) {
        HyperLog.d(TAG, packageName + ":blixtLndMobile pid: " + String.valueOf(p.pid));
        return true;
      }
    }
    return false;
  }

  private boolean killLndProcess() {
    String packageName = getApplicationContext().getPackageName();
    ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      if (p.processName.equals(packageName + ":blixtLndMobile")) {
        HyperLog.i(TAG, "Killing " + packageName + ":blixtLndMobile with pid: " + String.valueOf(p.pid));
        Process.killProcess(p.pid);
        return true;
      }
    }
    return false;
  }

  private void stopLnd(Messenger recipient, int request) {
    Lndmobile.stopDaemon(
      Rpc.StopRequest.newBuilder().build().toByteArray(),
      new Callback() {
        @Override
        public void onError(Exception e) {
          HyperLog.e(TAG, "Got Error when trying to stop lnd", e);

          lndStarted = false;

          if (recipient != null) {
            Message msg = Message.obtain(null, MSG_STOP_LND_RESULT, request, 0);

            Bundle bundle = new Bundle();
            bundle.putString("error_code", "Lnd Stop Error");
            bundle.putString("error_desc", e.toString());
            msg.setData(bundle);

            sendToClient(recipient, msg);
          }
        }

        @Override
        public void onResponse(byte[] bytes) {
          HyperLog.e(TAG, "onReponse for stopDaemon");

          lndStarted = false;

          if (recipient != null) {
            Message msg = Message.obtain(null, MSG_STOP_LND_RESULT, request, 0);

            Bundle bundle = new Bundle();
            bundle.putByteArray("response", bytes);
            msg.setData(bundle);

            sendToClient(recipient, msg);
          }
        }
      }
    );
  }
}
