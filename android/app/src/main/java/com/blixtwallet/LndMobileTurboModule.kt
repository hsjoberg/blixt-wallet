package com.blixtwallet

import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.TimeUnit

class LndMobileToolsTurboModule(reactContext: ReactApplicationContext) :
  NativeLndmobileToolsSpec(reactContext) {
  override fun getName() = NAME

  override fun startSyncWorker() {}

  override fun scheduleSyncWorker() {}

  override fun stopScheduleSyncWorker() {}

  override fun getStatus(): Double {
    val lnd = LndNative()
    return lnd.getStatus().toDouble()
  }

  companion object {
    const val NAME = "LndMobileToolsTurbo"
  }
}
