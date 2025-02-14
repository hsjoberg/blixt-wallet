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

  override fun startSyncWorker() {
    val syncWorkRequest = OneTimeWorkRequestBuilder<TurboLndSyncWorker>()
      .addTag("LND_SYNC_JOB")
      .addTag("ONE_OFF")
      .setConstraints(Constraints.NONE)
      .build()

    WorkManager.getInstance(reactApplicationContext).enqueue(syncWorkRequest)
  }

  override fun scheduleSyncWorker() {
    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val syncRequest = PeriodicWorkRequestBuilder<TurboLndSyncWorker>(1, TimeUnit.HOURS)
      .addTag("LND_SYNC_JOB")
      .addTag("PERIODIC")
      .setConstraints(constraints)
      .build()

    WorkManager.getInstance(reactApplicationContext).enqueueUniquePeriodicWork(
      "TURBOLND_SYNC",
      ExistingPeriodicWorkPolicy.KEEP,
      syncRequest
    )
  }

  companion object {
    const val NAME = "LndMobileToolsTurbo"
  }
}
