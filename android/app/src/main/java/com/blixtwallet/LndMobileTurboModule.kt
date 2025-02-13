package com.blixtwallet

import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.blixtwallet.NativeLndmobileToolsSpec
import java.util.concurrent.TimeUnit

class LndMobileToolsTurboModule(reactContext: ReactApplicationContext) : NativeLndmobileToolsSpec(reactContext) {
  override fun getName() = NAME

  override fun startSyncWorker() {

      val constraints = Constraints.Builder()
          .build()


      val syncWorkRequest = OneTimeWorkRequestBuilder<TurboLndSyncWorker>()
          .addTag("LND_SYNC_JOB")
          .setConstraints(Constraints.NONE)
          .build()

      WorkManager.getInstance(reactApplicationContext).enqueue(syncWorkRequest)

//      val syncRequest = PeriodicWorkRequestBuilder<TurboLndSyncWorker>(
//          15, // Repeat every 15 minutes
//          TimeUnit.MINUTES
//      )
//          .setConstraints(constraints)
//          .build()
//
//      WorkManager.getInstance(reactApplicationContext).enqueueUniquePeriodicWork(
//          "turbolnd_sync",
//          ExistingPeriodicWorkPolicy.KEEP,
//          syncRequest
//      )
  }

  companion object {
    const val NAME = "LndMobileToolsTurbo"
  }
}
