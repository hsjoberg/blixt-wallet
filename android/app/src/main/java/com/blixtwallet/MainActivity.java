package com.blixtwallet;

import com.facebook.react.ReactActivity;
import android.content.Intent;

import android.util.Log;
import android.os.Bundle;

public class MainActivity extends ReactActivity {
  static String TAG = "MainActiviy";
  static boolean started = false;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      started = true;
  }
  /**
      * Returns the name of the main component registered from JavaScript.
      * This is used to schedule rendering of the component.
      */
  @Override
  protected String getMainComponentName() {
      return "BlixtWallet";
  }
      @Override
  public void onNewIntent(Intent intent) {
      super.onNewIntent(intent);
      setIntent(intent);
  }
}
