package com.blixtwallet

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import com.google.protobuf.ByteString
import com.oblador.keychain.KeychainModule
import com.reactnativecommunity.asyncstorage.AsyncLocalStorageUtil
import com.reactnativecommunity.asyncstorage.ReactDatabaseSupplier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resumeWithException
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

private const val TAG = "LndMobileScheduledSyncWorker"
private const val SYNC_WORK_KEY = "syncWorkHistory"

// Add enum to represent different sync results
enum class SyncResult {
  IN_PROGRESS,                            // Job is currently running
  EARLY_EXIT_ACTIVITY_RUNNING,            // Exited because MainActivity was running
  SUCCESS_LND_ALREADY_RUNNING,            // LND was already running
  SUCCESS_CHAIN_SYNCED,                   // Full success with chain sync
  FAILURE_STATE_TIMEOUT,                  // State subscription timeout
  SUCCESS_ACTIVITY_INTERRUPTED,           // Stopped because MainActivity started
  FAILURE_GENERAL,                        // General failure
  FAILURE_CHAIN_SYNC_TIMEOUT,             // Chain sync specifically timed out
  EARLY_EXIT_PERSISTENT_SERVICES_ENABLED, // Persistent services enabled, skipping sync
  EARLY_EXIT_TOR_ENABLED,                 // Tor is enabled, skipping sync
  FAILURE_KEYCHAIN_DATASTORE_CONFLICT,    // DataStore conflict when accessing keychain
}

// Update data class with more metadata
data class SyncWorkRecord(
  val id: String,           // UUID for unique identification
  val timestamp: Long,      // When the work started (wall clock time)
  val duration: Long,
  val result: SyncResult,
  val errorMessage: String? = null
)

class LndMobileScheduledSyncWorker(
  context: Context,
  params: WorkerParameters
) : CoroutineWorker(context, params) {

  private val lnd = LndNative()
  private val stateChannel = Channel<lnrpc.Stateservice.WalletState>(Channel.UNLIMITED)
  private val workId = UUID.randomUUID().toString()  // Unique identifier for this work instance
  private val startTime = System.currentTimeMillis() // Track when work starts

  // Creates a new sync work record with IN_PROGRESS status
  // Call this at the start of the job
  private fun createSyncWorkRecord() {
    Log.d(TAG, "createSyncWorkRecord start")
    try {
      val newRecord = SyncWorkRecord(workId, startTime, 0, SyncResult.IN_PROGRESS, null)
      val db = ReactDatabaseSupplier.getInstance(applicationContext).get()

      // Get existing records
      val existingJson = AsyncLocalStorageUtil.getItemImpl(db, SYNC_WORK_KEY) ?: "[]"
      val records = parseRecords(existingJson)

      // Add new record and limit to 200 most recent
      val updatedRecords = (records + newRecord).takeLast(200)

      saveRecordsToDb(db, updatedRecords)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to create sync work record", e)
    }
    Log.d(TAG, "createSyncWorkRecord done")
  }

  // Updates an existing sync work record by workId (UUID)
  // Call this when the job finishes
  private fun updateSyncWorkRecord(result: SyncResult, errorMessage: String? = null) {
    Log.d(TAG, "updateSyncWorkRecord start: $result")
    try {
      val duration = System.currentTimeMillis() - startTime
      val db = ReactDatabaseSupplier.getInstance(applicationContext).get()

      // Get existing records
      val existingJson = AsyncLocalStorageUtil.getItemImpl(db, SYNC_WORK_KEY) ?: "[]"
      val records = parseRecords(existingJson)

      // Find and update the record with matching workId
      val updatedRecords = records.map { record ->
        if (record.id == workId) {
          SyncWorkRecord(workId, startTime, duration, result, errorMessage)
        } else {
          record
        }
      }

      saveRecordsToDb(db, updatedRecords)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to update sync work record", e)
    }
    Log.d(TAG, "updateSyncWorkRecord done")
  }

  private fun parseRecords(json: String): List<SyncWorkRecord> {
    return try {
      JSONArray(json).let { jsonArray ->
        (0 until jsonArray.length()).map { i ->
          val obj = jsonArray.getJSONObject(i)
          val id = obj.optString("id", "")
          SyncWorkRecord(
            id,
            obj.getLong("timestamp"),
            obj.getLong("duration"),
            SyncResult.valueOf(obj.getString("result")),
            obj.optString("errorMessage", "").ifEmpty { null }
          )
        }
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to parse existing records, starting fresh", e)
      emptyList()
    }
  }

  private fun saveRecordsToDb(db: android.database.sqlite.SQLiteDatabase, records: List<SyncWorkRecord>) {
    // Convert to JSON array
    val jsonArray = JSONArray().apply {
      records.forEach { record ->
        put(JSONObject().apply {
          put("id", record.id)
          put("timestamp", record.timestamp)
          put("duration", record.duration)
          put("result", record.result.name)
          record.errorMessage?.let { put("errorMessage", it) }
        })
      }
    }

    // Save back to database
    val sql = "INSERT OR REPLACE INTO catalystLocalStorage VALUES (?, ?);"
    db.compileStatement(sql).use { statement ->
      db.beginTransaction()
      try {
        statement.bindString(1, SYNC_WORK_KEY)
        statement.bindString(2, jsonArray.toString())
        statement.execute()
        db.setTransactionSuccessful()
      } finally {
        db.endTransaction()
      }
    }
  }

  override suspend fun doWork(): Result {
    try {
      Log.i(TAG, "------------------------------------");
      Log.i(TAG, "Starting sync worker");
      Log.i(TAG, "I am " + applicationContext.packageName);

      // Create the sync work record immediately so we always have a trace
      createSyncWorkRecord()

      // Check if MainActivity is running before starting sync
      // We don't want to start the sync worker if the app is running
      if (isMainActivityRunning()) {
        Log.d(TAG, "MainActivity is running, skipping daemon stop")
        updateSyncWorkRecord(SyncResult.EARLY_EXIT_ACTIVITY_RUNNING)
        return Result.success()
      }

      if (getPersistentServicesEnabled()) {
        Log.d(TAG, "Persistent services enabled, skipping sync")
        updateSyncWorkRecord(SyncResult.EARLY_EXIT_PERSISTENT_SERVICES_ENABLED)
        return Result.success()
      }

      if (getTorEnabled()) {
        Log.d(TAG, "Tor is enabled, skipping sync")
        updateSyncWorkRecord(SyncResult.EARLY_EXIT_TOR_ENABLED)
        return Result.success()
      }

      // Get wallet password early - fail fast if keychain access fails
      // This avoids starting LND only to fail at unlock time
      Log.i(TAG, "Retrieving wallet password from keychain")
      val walletPassword = try {
        getWalletPassword()
      } catch (e: DataStoreConflictException) {
        Log.e(TAG, "DataStore conflict when accessing keychain", e)
        updateSyncWorkRecord(SyncResult.FAILURE_KEYCHAIN_DATASTORE_CONFLICT, e.message)
        return Result.success() // Don't retry immediately, wait for next scheduled run
      }

      // Start LND and check if it's already running
      val isAlreadyRunning = startLnd()
      if (isAlreadyRunning) {
        Log.w(TAG, "LND was already running when sync worker started")
        Log.w(TAG, "Continuing anyway, but this shouldn't happen")

        // Log.d(TAG, "LND already running, marking work as success")
        // saveSyncWorkRecord(SyncResult.SUCCESS_LND_ALREADY_RUNNING)
        // stopDaemon() // Worth a try I suppose
        // return Result.success()
      }

      // Subscribe to the state of the wallet
      // This will block until the wallet is unlocked and active
      // Exit if the wallet is not unlocked and active after 60 seconds
      subscribeToState()
      var walletState: lnrpc.Stateservice.WalletState
      val result = withTimeoutOrNull(60_000) {
        while (true) {
          walletState = stateChannel.receive()

          when (walletState) {
            lnrpc.Stateservice.WalletState.UNLOCKED,
            lnrpc.Stateservice.WalletState.RPC_ACTIVE,
            lnrpc.Stateservice.WalletState.SERVER_ACTIVE -> {
              Log.d(TAG, "Wallet already unlocked and active")
              return@withTimeoutOrNull false
            }

            lnrpc.Stateservice.WalletState.LOCKED -> {
              Log.d(TAG, "Wallet locked, attempting unlock")
              unlockWallet(walletPassword)

              // Wait for unlock confirmation
              while (true) {
                walletState = stateChannel.receive()

                if (
                  walletState == lnrpc.Stateservice.WalletState.RPC_ACTIVE ||
                  walletState == lnrpc.Stateservice.WalletState.SERVER_ACTIVE
                ) {
                  Log.d(TAG, "Got state: $walletState")
                  return@withTimeoutOrNull true
                }
              }
            }

            else -> continue
          }
        }
      }

      // If the wallet is not unlocked and active after 60 seconds, we'll exit
      if (result == null) {
        Log.i(TAG, "State timeout reached")
        Log.i(TAG, "Exiting as success")
        updateSyncWorkRecord(SyncResult.FAILURE_STATE_TIMEOUT)
        val appRunning = stopDaemonIfAppNotRunning()
        if (appRunning) {
          updateSyncWorkRecord(SyncResult.FAILURE_STATE_TIMEOUT, "app started, daemon not stopped")
        }
        return Result.success()
      }

      // Poll until chain is synced or timeout reached
      Log.i(TAG, "Waiting for chain sync")
      val chainSynced = withTimeoutOrNull(60_000) {
        var isSynced = false
        while (!isSynced) {
          val info = getInfo()
          isSynced = info.syncedToChain
          Log.d(TAG, "Chain sync status: $isSynced")
          if (!isSynced) {
            delay(5000) // Check every 5 seconds
          }
        }
        true
      } ?: false

      if (!chainSynced) {
        Log.i(TAG, "Chain sync timeout reached")
        updateSyncWorkRecord(SyncResult.FAILURE_CHAIN_SYNC_TIMEOUT)
        val appRunning = stopDaemonIfAppNotRunning()
        if (appRunning) {
          updateSyncWorkRecord(SyncResult.FAILURE_CHAIN_SYNC_TIMEOUT, "app started, daemon not stopped")
        }
        return Result.success()
      }

      delay(1000)

      updateSyncWorkRecord(SyncResult.SUCCESS_CHAIN_SYNCED)
      val appRunning = stopDaemonIfAppNotRunning()
      if (appRunning) {
        updateSyncWorkRecord(SyncResult.SUCCESS_CHAIN_SYNCED, "app started, daemon not stopped")
      }

      Log.i(TAG, "Sync worker finished");
      Log.i(TAG, "------------------------------------");

      return Result.success()
    } catch (e: Exception) {
      Log.e(TAG, "Fail in Sync Worker", e)

      updateSyncWorkRecord(SyncResult.FAILURE_GENERAL, e.message)

      var appRunning = false
      try {
        appRunning = stopDaemonIfAppNotRunning()
      } catch (stopError: Exception) {
        Log.e(TAG, "Failed to stop daemon during error handling", stopError)
      }

      if (appRunning) {
        val errorMsg = (e.message ?: "") + " (app started, daemon not stopped)"
        updateSyncWorkRecord(SyncResult.FAILURE_GENERAL, errorMsg)
      }

      return if (appRunning) Result.success() else Result.failure()
    }
  }

  private suspend fun startLnd(): Boolean = suspendCancellableCoroutine { cont ->
    Log.i(TAG, "Starting lnd")

    val params = "--nolisten --lnddir=" + applicationContext.filesDir.path;

    lnd.startLnd(
      params,
      object : LndCallback {
        override fun onResponse(data: ByteArray) {
          if (!cont.isCompleted) {
            // false means LND was started fresh
            cont.resume(false) { _, _, _ -> }
          }
        }

        override fun onError(error: String) {
          if (!cont.isCompleted) {
            if (error.contains("lnd already started")) {

              // true means LND was already running
              cont.resume(true) { _, _, _ -> }
            } else {
              cont.resumeWithException(Exception("LND start failed: $error"))
            }
          }
        }
      })
  }

  private suspend fun subscribeToState() = suspendCancellableCoroutine<Unit> { cont ->
    val emptyRequest = ByteArray(0)
    val listener = object : LndStreamListener {
      override fun onResponse(data: ByteArray) {
        val state = lnrpc.Stateservice.SubscribeStateResponse.parseFrom(data).state
        Log.d(TAG, "Wallet state: $state")

        CoroutineScope(cont.context).launch {
          stateChannel.send(state)
        }
      }

      override fun onError(error: String) {
        if (error.contains("EOF")) {
          Log.i(TAG, "Got EOF in subscribeState")
          return
        }

        Log.e(TAG, "State stream error: $error")
        // cont.resumeWithException(Exception(error))
      }
    }

    lnd.subscribeState(emptyRequest, listener)

    cont.resume(Unit) { _, _, _ -> }

    // Optional: Add timeout for safety
    cont.invokeOnCancellation {
      // Ideally implement cancellation in JNI (requires falafel changes)
      Log.w(TAG, "State subscription cancelled")
    }
  }

  private suspend fun getInfo() =
    suspendCancellableCoroutine<lnrpc.LightningOuterClass.GetInfoResponse> { cont ->
      val emptyRequest = ByteArray(0)
      lnd.getInfo(emptyRequest, object : LndCallback {
        override fun onResponse(data: ByteArray) {
          try {
            val info = lnrpc.LightningOuterClass.GetInfoResponse.parseFrom(data)
            cont.resume(info) { _, _, _ -> }

          } catch (e: Exception) {
            cont.resumeWithException(e)
          }
        }

        override fun onError(error: String) {
          cont.resumeWithException(Exception("GetInfo failed: $error"))
        }
      })
    }

  private suspend fun stopDaemon() {
    // Check if lnd is already stopped
    val initialStatus = lnd.getStatus()
    if (initialStatus == 0) {
      Log.d(TAG, "lnd is already stopped, nothing to do")
      return
    }

    // Step 1: Send the stopDaemon RPC
    suspendCancellableCoroutine<Unit> { cont ->
      val emptyRequest = ByteArray(0)
      lnd.stopDaemon(emptyRequest, object : LndCallback {
        override fun onResponse(data: ByteArray) {
          Log.d(TAG, "stopDaemon onResponse (RPC acknowledged)")
          cont.resume(Unit) { _, _, _ -> }
        }

        override fun onError(error: String) {
          Log.d(TAG, "stopDaemon onError $error")
          cont.resumeWithException(Exception("stopDaemon failed: $error"))
        }
      })
    }

    // Step 2: Wait for lnd to actually shut down by polling getStatus()
    // getStatus() returns 1 if lnd is running, 0 if stopped
    Log.d(TAG, "Waiting for lnd to fully shut down...")
    val maxWaitMs = 120_000L // 120 seconds max wait
    val pollIntervalMs = 500L
    val startTime = System.currentTimeMillis()

    while (true) {
      val status = lnd.getStatus()
      Log.d(TAG, "lnd status: $status")

      if (status == 0) {
        Log.d(TAG, "lnd has fully shut down")
        break
      }

      if (System.currentTimeMillis() - startTime > maxWaitMs) {
        Log.w(TAG, "Timeout waiting for lnd to shut down, status still: $status")
        break
      }

      delay(pollIntervalMs)
    }
  }

  // Returns true if the app was running (daemon was NOT stopped)
  // Returns false if the daemon was stopped successfully
  private suspend fun stopDaemonIfAppNotRunning(): Boolean {
    if (isMainActivityRunning()) {
      Log.d(TAG, "MainActivity is running, skipping daemon stop")
      return true
    }
    stopDaemon()
    return false
  }

  // Custom exception for DataStore conflicts
  class DataStoreConflictException(message: String) : Exception(message)

  // Retrieves wallet password from keychain with retry logic
  // Retries up to 3 times with exponential backoff (2s, 4s, 8s) on DataStore conflicts
  // Throws DataStoreConflictException if all retries fail
  private suspend fun getWalletPassword(): String {
    val maxRetries = 3
    var lastException: Exception? = null

    for (attempt in 1..maxRetries) {
      try {
        Log.d(TAG, "getWalletPassword attempt $attempt of $maxRetries")
        return getWalletPasswordInternal()
      } catch (e: DataStoreConflictException) {
        lastException = e
        Log.w(TAG, "DataStore conflict on attempt $attempt: ${e.message}")

        if (attempt < maxRetries) {
          val backoffMs = (1 shl attempt) * 1000L // 2s, 4s, 8s
          Log.d(TAG, "Waiting ${backoffMs}ms before retry...")
          delay(backoffMs)

          // Check if app started during backoff
          if (isMainActivityRunning()) {
            throw Exception("MainActivity started during password retrieval, aborting")
          }
        }
      }
    }

    // All retries exhausted - throw the DataStore exception so caller can handle it
    throw lastException ?: DataStoreConflictException("getWalletPassword failed after $maxRetries attempts")
  }

  // Internal implementation that retrieves password from keychain
  private suspend fun getWalletPasswordInternal(): String = suspendCancellableCoroutine { cont ->
    var bridgeReactContext: BridgeReactContext? = null
    var keychainModule: KeychainModule? = null
    var keychainModuleError: Exception? = null

    // Helper to clean up the context and module
    fun cleanup() {
      val module = keychainModule
      val context = bridgeReactContext

      if (module == null && context == null) {
        Log.d(TAG, "Nothing to cleanup")
        return
      }

      try {
        val latch = CountDownLatch(1)
        Log.d(TAG, "Scheduling React Native cleanup on UI thread")
        UiThreadUtil.runOnUiThread(Runnable {
          try {
            module?.let {
              Log.d(TAG, "Invalidating KeychainModule on UI thread")
              it.invalidate()
            }
            context?.let {
              Log.d(TAG, "Destroying BridgeReactContext on UI thread")
              it.destroy()
            }
            Log.d(TAG, "React Native cleanup completed on UI thread")
          } catch (e: Exception) {
            Log.w(TAG, "Error during React Native cleanup on UI thread", e)
          } finally {
            latch.countDown()
          }
        })

        val completed = latch.await(5, TimeUnit.SECONDS)
        if (!completed) {
          Log.w(TAG, "Timeout waiting for UI thread cleanup")
        }
        Log.d(TAG, "Keychain and context cleanup finished")
      } catch (e: Exception) {
        Log.w(TAG, "Error during cleanup", e)
      }
    }

    // Check if MainActivity started (race condition protection)
    // if (isMainActivityRunning()) {
    //   cont.resumeWithException(Exception("MainActivity is now running, aborting password retrieval"))
    //   return@suspendCancellableCoroutine
    // }

    // Step 1: Create BridgeReactContext on UI thread
    val contextLatch = CountDownLatch(1)
    Log.d(TAG, "Creating BridgeReactContext on UI thread")
    UiThreadUtil.runOnUiThread(Runnable {
      try {
        bridgeReactContext = BridgeReactContext(applicationContext)
        Log.d(TAG, "BridgeReactContext created on UI thread")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to create BridgeReactContext on UI thread", e)
      } finally {
        contextLatch.countDown()
      }
    })
    contextLatch.await(5, TimeUnit.SECONDS)

    if (bridgeReactContext == null) {
      cont.resumeWithException(Exception("Failed to create BridgeReactContext"))
      return@suspendCancellableCoroutine
    }

    // Step 2: Create KeychainModule on UI thread
    val moduleLatch = CountDownLatch(1)
    Log.d(TAG, "Creating KeychainModule on UI thread")
    UiThreadUtil.runOnUiThread(Runnable {
      try {
        keychainModule = KeychainModule(bridgeReactContext!!)
        Log.d(TAG, "KeychainModule created on UI thread")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to create KeychainModule on UI thread", e)
        keychainModuleError = e
      } finally {
        moduleLatch.countDown()
      }
    })
    moduleLatch.await(5, TimeUnit.SECONDS)

    if (keychainModule == null) {
      cleanup()
      val error = keychainModuleError
      // Check if this is a DataStore conflict error
      if (error != null && error.message?.contains("multiple DataStores active") == true) {
        cont.resumeWithException(DataStoreConflictException(error.message ?: "DataStore conflict"))
      } else {
        cont.resumeWithException(error ?: Exception("Failed to create KeychainModule"))
      }
      return@suspendCancellableCoroutine
    }

    // Step 3: Get password from keychain
    val keychainOptions = Arguments.createMap()
    val keychainOptionsAuthenticationPrompt = Arguments.createMap()
    keychainOptionsAuthenticationPrompt.putString("title", "Authenticate to retrieve secret")
    keychainOptionsAuthenticationPrompt.putString("cancel", "Cancel")
    keychainOptions.putMap("authenticationPrompt", keychainOptionsAuthenticationPrompt)

    keychainModule!!.getInternetCredentialsForServer(
      "password",
      keychainOptions,
      object : PromiseWrapper() {
        public override fun onSuccess(value: Any?) {
          if (value == null) {
            Log.e(TAG, "Failed to get wallet password, got null from keychain provider")
            cleanup()
            cont.resumeWithException(Exception("Password retrieval failed: value == null"))
            return
          }

          Log.d(TAG, "Password data retrieved from keychain")
          val password = (value as ReadableMap).getString("password")
          Log.d(TAG, "Password retrieved")

          // Clean up immediately after getting password
          Log.d(TAG, "Cleaning up keychain access")
          cleanup()

          // Return the password
          cont.resume(password ?: "") { _, _, _ -> }
        }

        public override fun onFail(throwable: Throwable) {
          Log.d(TAG, "Failed to get wallet password " + throwable.message, throwable)
          cleanup()
          // Check if this is a DataStore conflict error
          if (throwable.message?.contains("multiple DataStores active") == true) {
            cont.resumeWithException(DataStoreConflictException(throwable.message ?: "DataStore conflict"))
          } else {
            cont.resumeWithException(Exception("Password retrieval failed: $throwable"))
          }
          return
        }
      })
  }

  // Unlocks the wallet with the provided password
  private suspend fun unlockWallet(password: String) = suspendCancellableCoroutine<Unit> { cont ->
    Log.d(TAG, "Unlocking wallet with lnd")

    val unlockRequest = lnrpc.Walletunlocker.UnlockWalletRequest.newBuilder()
      .setWalletPassword(ByteString.copyFromUtf8(password))
      .build()
      .toByteArray()

    lnd.unlockWallet(unlockRequest, object : LndCallback {
      override fun onResponse(data: ByteArray) {
        Log.d(TAG, "Wallet unlocked successfully")
        cont.resume(Unit) { _, _, _ -> }
      }

      override fun onError(error: String) {
        Log.e(TAG, "unlockWallet failed: $error")
        cont.resumeWithException(Exception("Unlock failed: $error"))
      }
    })
  }

  private fun isMainActivityRunning(): Boolean {
    val activityManager =
      applicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val appTasks = activityManager.appTasks

    Log.d(TAG, "appTasks: $appTasks")

    val ourPackageName = applicationContext.packageName

    return appTasks.any { task ->
      val taskInfo = task.taskInfo

      val topActivity = taskInfo?.topActivity
      Log.d(TAG, "Top activity: ${topActivity?.className}, package: ${topActivity?.packageName}")

      topActivity?.className?.contains("MainActivity") == true &&
      topActivity.packageName == ourPackageName
    }
  }

  private fun getTorEnabled(): Boolean {
    val db = ReactDatabaseSupplier.getInstance(applicationContext).get()
    val torEnabled = AsyncLocalStorageUtil.getItemImpl(db, "torEnabled")
    if (torEnabled != null) {
      return torEnabled == "true"
    }
    Log.w(TAG, "Could not find torEnabled in asyncStorage")
    return false
  }

  private fun getPersistentServicesEnabled(): Boolean {
    val db = ReactDatabaseSupplier.getInstance(applicationContext).get()
    val persistentServicesEnabled = AsyncLocalStorageUtil.getItemImpl(db, "persistentServicesEnabled")
    if (persistentServicesEnabled != null) {
      return persistentServicesEnabled == "true"
    }
    Log.w(TAG, "Could not find persistentServicesEnabled in asyncStorage")
    return false
  }
}
