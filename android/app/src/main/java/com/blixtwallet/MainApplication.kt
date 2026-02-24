package com.blixtwallet

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost


import com.hypertrack.hyperlog.HyperLog

class MainApplication : Application(), ReactApplication {

override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
          context = applicationContext,
          packageList =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(LndMobileToolsPackage())
              add(LndMobileScheduledSyncPackage())

              // TurboModules
              add(LndMobileToolsTurboPackage())
            },
        )
      }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)

        /**
         * Blixt:
         */
        HyperLog.initialize(this)
        HyperLog.setLogLevel(
            if (BuildConfig.DEBUG) Log.VERBOSE else Log.DEBUG
        )
    }
}
