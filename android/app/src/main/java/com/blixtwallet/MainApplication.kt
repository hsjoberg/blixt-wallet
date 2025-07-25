package com.blixtwallet

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

import com.hypertrack.hyperlog.HyperLog

class MainApplication : Application(), ReactApplication {
    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                // Packages that cannot be autolinked yet can be added manually here, for example:
                // packages.add(new MyReactNativePackage());

                /**
                 * Blixt:
                 */
                val packages: MutableList<ReactPackage> = PackageList(this).packages
                packages.add(LndMobilePackage())
                packages.add(LndMobileToolsPackage())
                packages.add(LndMobileScheduledSyncPackage())

                // TurboModules
                packages.add(LndMobileToolsTurboPackage())

                return packages;

                // return PackageList(this).packages
            }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

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
