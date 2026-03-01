package com.blixtwallet

import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.TimeUnit

class ScheduledSyncTurboModule(reactContext: ReactApplicationContext) :
  NativeScheduledSyncTurboSpec(reactContext) {
  private val lndScheduledSyncWorkName = "LND_SCHEDULED_SYNC_WORK"
  private val workManager = WorkManager.getInstance(reactContext)

  override fun getName() = NAME

  override fun startSyncWorker() {
    val oneTimeWorkRequest = OneTimeWorkRequestBuilder<LndMobileScheduledSyncWorker>()
      .setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build()
      )
      .build()
    workManager.enqueue(oneTimeWorkRequest)
  }

  override fun scheduleSyncWorker() {
    val periodicWorkRequest = if (BuildConfig.DEBUG) {
      PeriodicWorkRequestBuilder<LndMobileScheduledSyncWorker>(15, TimeUnit.MINUTES)
    } else {
      PeriodicWorkRequestBuilder<LndMobileScheduledSyncWorker>(2, TimeUnit.HOURS)
    }

    workManager.enqueueUniquePeriodicWork(
      lndScheduledSyncWorkName,
      ExistingPeriodicWorkPolicy.REPLACE,
      periodicWorkRequest.setConstraints(
        Constraints.Builder()
          .setRequiredNetworkType(NetworkType.CONNECTED)
          .build()
      ).build()
    )
  }

  override fun stopScheduleSyncWorker() {
    workManager.cancelUniqueWork(lndScheduledSyncWorkName)
  }

  override fun setupScheduledSyncWork(promise: Promise) {
    try {
      scheduleSyncWorker()
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("setup_scheduled_sync_failed", e)
    }
  }

  override fun removeScheduledSyncWork(promise: Promise) {
    try {
      stopScheduleSyncWorker()
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("remove_scheduled_sync_failed", e)
    }
  }

  override fun checkScheduledSyncWorkStatus(promise: Promise) {
    try {
      val workInfoList = workManager.getWorkInfosForUniqueWork(lndScheduledSyncWorkName).get()
      if (workInfoList.isEmpty()) {
        promise.resolve("WORK_NOT_EXIST")
        return
      }
      promise.resolve(workInfoList.first().state.toString())
    } catch (e: Throwable) {
      promise.reject("check_scheduled_sync_status_failed", e)
    }
  }

  companion object {
    const val NAME = "ScheduledSyncTurbo"
  }
}
