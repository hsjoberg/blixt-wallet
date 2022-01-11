package com.blixtwallet;

import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;
import java.util.Stack;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.torproject.jni.TorService;

public class BlixtTor extends ReactContextBaseJavaModule {
  static private final String TAG = "BlixtTor";
  static TorService torService;
  static String currentTorStatus = TorService.STATUS_OFF;
  static boolean torServiceBound = false;
  static Stack<Promise> calleeResolvers = new Stack<>();

  static private final ServiceConnection torServiceConnection = new ServiceConnection() {
    @Override
    public void onServiceConnected(ComponentName className, IBinder service) {
      // We've bound to LocalService, cast the IBinder and get LocalService instance
      TorService.LocalBinder binder = (TorService.LocalBinder) service;
      torService = binder.getService();
      torServiceBound = true;
      Log.i(TAG, "onServiceConnected");
    }

    @Override
    public void onServiceDisconnected(ComponentName arg0) {
      torServiceBound = false;
      Log.i(TAG, "onServiceDisconnected");
    }
  };

  private final BroadcastReceiver torBroadcastReceiver = new BroadcastReceiver() {
    @Override
    public void onReceive(Context context, Intent intent) {
//          Toast.makeText(context, intent.getStringExtra(TorService.EXTRA_STATUS), Toast.LENGTH_SHORT).show();
      String status = intent.getStringExtra(TorService.EXTRA_STATUS);
      currentTorStatus = status;
      Log.i(TAG, "onReceive " + status);
      if (status.equals(TorService.STATUS_ON)) {
        while (calleeResolvers.size() > 0) {
          calleeResolvers.pop().resolve(TorService.socksPort);
        }
      }
    }
  };

  public BlixtTor(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  public String getName() {
    return "BlixtTor";
  }

  @ReactMethod
  public void startTor(Promise promise) {
    Log.i(TAG, "KOMMER HIT");
//    if (calleeResolver != null) {
//      Log.i(TAG, "calleeResolver != null");
//      promise.reject(TAG, "Tor already in progress starting");
//      return;
//    }
    if (torServiceBound || currentTorStatus.equals(TorService.STATUS_ON)) {
      Log.i(TAG, "torServiceBound: " + torServiceBound + " currentTorStatus.equals(TorService.STATUS_ON)" + currentTorStatus.equals(TorService.STATUS_ON));
      promise.resolve(TorService.socksPort);
      return;
    }
    Log.i(TAG, "KOMMER HIT wat" + torServiceBound + " " + currentTorStatus);
    calleeResolvers.add(promise);
    
    getReactApplicationContext().registerReceiver(torBroadcastReceiver, new IntentFilter(TorService.ACTION_STATUS));
    Intent intent = new Intent(getReactApplicationContext(), TorService.class);
    getReactApplicationContext().bindService(intent, torServiceConnection, Context.BIND_AUTO_CREATE);
  }

  @ReactMethod
  public void stopTor(Promise promise) {
    if (torServiceBound) {
      Log.i(TAG,"Unbinding TorService");
      getReactApplicationContext().unregisterReceiver(torBroadcastReceiver);
      getReactApplicationContext().unbindService(torServiceConnection);
    }
    promise.resolve(true);
  };
}
