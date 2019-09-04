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
import android.os.RemoteException;
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
        Log.i(TAG, "handleMessage(" + msg + ")");
        Bundle bundle = msg.getData();
        final int request = msg.arg1;

        switch (msg.what) {
          case MSG_REGISTER_CLIENT:
            mClients.add(msg.replyTo);
            Log.d(TAG, "Got register client " + msg.replyTo);
            sendToClients(Message.obtain(null, MSG_REGISTER_CLIENT_ACK, request, 0));
            break;

          case MSG_UNREGISTER_CLIENT:
            Log.d(TAG, "Got unregister client " + msg.replyTo);
            mClients.remove(msg.replyTo);
            break;

          case MSG_START_LND:
            final String args = bundle.getString("args", "");
            startLnd(args, request);
            break;

          case MSG_GRPC_COMMAND:
          case MSG_GRPC_STREAM_COMMAND:
            final String method = bundle.getString("method");
            Method m = syncMethods.get(method);

            if (m == null) {
              m = streamMethods.get(method);

              if (m == null) {
                Log.e(TAG, "Method " + method + "not found");
                return;
              }
            }

            boolean streamOnlyOnce = bundle.getBoolean("stream_only_once");

            if (msg.what == MSG_GRPC_STREAM_COMMAND) {
              if (streamOnlyOnce) {
                if (streamsStarted.contains(method)) {
                  Log.i(TAG, "Attempting to stream " + method + " twice, not allowing");
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
                ? new LndCallback(method, request)
                : new LndStreamCallback(method)
              );
            } catch (IllegalAccessException | InvocationTargetException e) {
              e.printStackTrace();   // TODO: Remove or Log.d()
            }

            break;

          case MSG_CHECKSTATUS:
            int flags = 0;

            if (lndStarted) {
              flags += LndMobile.LndStatus.PROCESS_STARTED.flag;
            }

            if (walletUnlocked) {
              flags += LndMobile.LndStatus.WALLET_UNLOCKED.flag;
            }

            Log.i(TAG, "MSG_CHECKSTATUS sending " + flags);
            sendToClients(Message.obtain(null, MSG_CHECKSTATUS_RESPONSE, request, flags));
            break;

          default:
            super.handleMessage(msg);
        }
    }
  }

  class LndCallback implements lndmobile.Callback {
    private final String method;
    private final int request;

    LndCallback(String method, int request) {
      this.method = method;
      this.request = request;
    }

    @Override
    public void onError(Exception e) {
      Log.e(TAG, "LndCallback onError() for " + method, e);
      e.printStackTrace();   // TODO: Remove or Log.d()

      Message msg = Message.obtain(null, MSG_GRPC_COMMAND_RESULT, request, 0);

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

      bundle.putString("error", message);
      msg.setData(bundle);

      sendToClients(msg);
    }

    @Override
    public void onResponse(byte[] bytes) {
      Log.d(TAG, "LndCallback onResponse() for " + method);

      // Hack for checking if request is UnlockWallet or InitWallet
      // in which case we'll set walletUnlocked to true
      if (this.method.equals("UnlockWallet") || this.method.equals("InitWallet")) {
        walletUnlocked = true;
      }

      Message msg = Message.obtain(null, MSG_GRPC_COMMAND_RESULT, request, 0);

      Bundle bundle = new Bundle();
      bundle.putByteArray("response", bytes);
      bundle.putString("method", method);

      msg.setData(bundle);
      sendToClients(msg);
      Log.i(TAG, "sent");
    }
  }

  class LndStreamCallback implements lndmobile.RecvStream {
    private final String method;

    LndStreamCallback(String method) {
      this.method = method;
    }

    @Override
    public void onError(Exception e) {
      Log.e(TAG, "LndStreamCallback onError() for " + method, e);
      e.printStackTrace();   // TODO: Remove or Log.d()

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

      sendToClients(msg);
    }

    @Override
    public void onResponse(byte[] bytes) {
      Log.d(TAG, "onResponse() for " + method);
      Message msg = Message.obtain(null, MSG_GRPC_STREAM_RESULT, 0, 0);

      Bundle bundle = new Bundle();
      bundle.putByteArray("response", bytes);
      bundle.putString("method", method);
      msg.setData(bundle);

      sendToClients(msg);
    }
  }

  void startLnd(String args, int request) {
    Log.d(TAG, "startLnd(): Starting lnd");
    Runnable startLnd = new Runnable() {

      @Override
      public void run() {
        Lndmobile.start(args, new lndmobile.Callback() {

          @Override
          public void onError(Exception e) {
            e.printStackTrace();   // TODO: Remove or Log.d()

            Message msg = Message.obtain(null, MSG_START_LND_RESULT, request, 0);

            Bundle bundle = new Bundle();
            bundle.putString("error_code", "Lnd Startup Error");
            bundle.putString("error_desc", e.toString());
            msg.setData(bundle);

            sendToClients(msg);
          }

          @Override
          public void onResponse(byte[] bytes) {
            lndStarted = true;
            Message msg = Message.obtain(null, MSG_START_LND_RESULT, request, 0);

            Bundle bundle = new Bundle();
            bundle.putByteArray("response", bytes);
            msg.setData(bundle);

            sendToClients(msg);
          }
        });
      }
    };

    new Thread(startLnd).start();
  }

  void sendToClients(Message msg) {
    for (int i = 0; i < mClients.size(); i++) {
      try {
          mClients.get(i).send(msg);
      } catch (RemoteException e) {
          // The client is dead.  Remove it from the list;
          // we are going through the list from back to front
          // so this is safe to do inside the loop.
          mClients.remove(i);    // TODO: Need to fix this. See https://docs.oracle.com/javase/8/docs/api/java/util/ArrayList.html#remove-int-
      }
    }
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return messenger.getBinder();
  }

  @Override
  public boolean onUnbind(Intent intent) {
    Log.d(TAG, "onUnbind()");
    return false;
  }

  @Override
  public void onRebind(Intent intent) {
    Log.d(TAG, "onRebind()");
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
  }

  private boolean checkLndProcessExists() {
    ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);

    for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
      if (p.processName.equals("com.blixtwallet:blixtLndMobile")) {
        Log.i(TAG, "com.blixtwallet:blixtLndMobile pid: " + String.valueOf(p.pid));
        return true;
      }
    }

    return false;
  }
}
