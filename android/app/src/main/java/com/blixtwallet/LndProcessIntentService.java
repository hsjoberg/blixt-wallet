package com.blixtwallet;

import android.app.ActivityManager;
import android.app.IntentService;
import android.content.Context;
import android.content.Intent;
import android.os.Process;
import androidx.annotation.Nullable;

import android.util.Log;

public class LndProcessIntentService extends IntentService {
    private static final String TAG = "LndProcessIntentService";

    boolean canBeDestroyed = false;
    boolean lndRunning = false;

    public LndProcessIntentService() {
      super("LndProcessIntentService");
    }

    @Override
    protected void onHandleIntent(@Nullable Intent intent) {
      canBeDestroyed = false;
      Log.i(TAG, intent.getStringExtra("args"));

      final String args = intent.getStringExtra("args");

      Log.i(TAG, "Starting LND");
      canBeDestroyed = false;
      lndRunning = true;
      // final String error = lnd.Lnd.start(args);
      Log.e(TAG, "Blixt.lnd.Lnd.start() ended");
      // Log.e(TAG, error);
      canBeDestroyed = true;
      stopSelf();
    }

    @Override
    public void onDestroy() {
      Log.i(TAG, "onDestroy: Stopping LND");
      Log.e(TAG, "canBeDestroyed: " + canBeDestroyed);

      if (lndRunning) {
        Log.e(TAG, "Destroying lnd from onDestroy()");
        // lnd.Lnd.stop();
      }

      lndRunning = false;

      while (!canBeDestroyed) {
        Log.e(TAG, "canBeDestroyed false, waiting for it to be true");
        try {
          Thread.sleep(1500);
        } catch (InterruptedException e) {
          e.printStackTrace();
        }
      }

      Log.e(TAG, "canBeDestroyed: " + canBeDestroyed);

      ActivityManager am = (ActivityManager)getSystemService(Context.ACTIVITY_SERVICE);
      for (ActivityManager.RunningAppProcessInfo p : am.getRunningAppProcesses()) {
        Log.i(TAG, "name: " + p.processName);
        Log.i(TAG, "pid: " + String.valueOf(p.pid));

        if (p.processName.equals("com.blixtwallet:blixtLndProcess")) {
          Log.i(TAG, "Found com.blixtwallet:blixtLndProcess: " + String.valueOf(p.pid));
          Process.killProcess(p.pid);
        }
      }

      super.onDestroy();
    }
}
