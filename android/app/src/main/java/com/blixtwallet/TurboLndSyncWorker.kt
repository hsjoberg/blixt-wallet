package com.blixtwallet

import android.app.ActivityManager
import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.ReadableMap
import com.google.protobuf.ByteString
import com.hypertrack.hyperlog.HyperLog
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

private const val TAG = "TurboLndSyncWorker"
private const val SYNC_WORK_KEY = "syncWorkHistory"
private const val ONE_OFF_TAG = "ONE_OFF"
private const val PERIODIC_TAG = "PERIODIC"

// Add enum to represent different sync results
private enum class SyncResult {
  EARLY_EXIT_ACTIVITY_RUNNING,  // Exited because MainActivity was running
  SUCCESS_LND_ALREADY_RUNNING,      // LND was already running
  SUCCESS_CHAIN_SYNCED,         // Full success with chain sync
  FAILURE_STATE_TIMEOUT,        // State subscription timeout
  SUCCESS_ACTIVITY_INTERRUPTED, // Stopped because MainActivity started
  FAILURE_GENERAL,             // General failure
  FAILURE_CHAIN_SYNC_TIMEOUT   // Chain sync specifically timed out
}

// Update data class with more metadata
private data class SyncWorkRecord(
  val timestamp: Long,
  val duration: Long,
  val result: SyncResult,
  val errorMessage: String? = null
)

class TurboLndSyncWorker(
  context: Context,
  params: WorkerParameters
) : CoroutineWorker(context, params) {

  private val lnd = LndNative()
  private val stateChannel = Channel<lnrpc.Stateservice.WalletState>(Channel.UNLIMITED)
  private val startTime = System.currentTimeMillis() // Track when work starts

  // Add function to save sync work record
  private fun saveSyncWorkRecord(result: SyncResult, errorMessage: String? = null) {
    Log.d(TAG, "saveSyncWorkRecord start: $result")
    try {
      val duration = System.currentTimeMillis() - startTime
      val newRecord = SyncWorkRecord(startTime, duration, result, errorMessage)
      
      val db = ReactDatabaseSupplier.getInstance(getApplicationContext()).get()
      
      // Get existing records
      val existingJson = AsyncLocalStorageUtil.getItemImpl(db, SYNC_WORK_KEY) ?: "[]"
      val records = try {
        JSONArray(existingJson).let { jsonArray ->
          (0 until jsonArray.length()).map { i ->
            val obj = jsonArray.getJSONObject(i)
            SyncWorkRecord(
              obj.getLong("timestamp"),
              obj.getLong("duration"),
              SyncResult.valueOf(obj.getString("result")),
              obj.optString("errorMessage", null)
            )
          }
        }
      } catch (e: Exception) {
        Log.w(TAG, "Failed to parse existing records, starting fresh", e)
        emptyList()
      }

      // Add new record and limit to 100 most recent
      val updatedRecords = (records + newRecord).takeLast(100)

      // Convert to JSON array
      val jsonArray = JSONArray().apply {
        updatedRecords.forEach { record ->
          put(JSONObject().apply {
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
    } catch (e: Exception) {
      Log.e(TAG, "Failed to save sync work record", e)
    }
    Log.d(TAG, "saveSyncWorkRecord done")
  }

  override suspend fun doWork(): Result {
    return try {
      if (isMainActivityRunning()) {
        Log.d(TAG, "MainActivity is running, skipping daemon stop")
        saveSyncWorkRecord(SyncResult.EARLY_EXIT_ACTIVITY_RUNNING)
        return Result.success()
      }

      Log.i(TAG, "------------------------------------");
      Log.i(TAG, "Starting sync worker");
      Log.i(TAG, "I am " + getApplicationContext().getPackageName());
      val isAlreadyRunning = startLnd()

      if (isAlreadyRunning) {
        Log.d(TAG, "LND already running, marking work as success")
        saveSyncWorkRecord(SyncResult.SUCCESS_LND_ALREADY_RUNNING)
        return Result.success()
      }

      subscribeToState()
      var walletState: lnrpc.Stateservice.WalletState

      val result = withTimeoutOrNull(30_000) {
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
              unlockWallet()

              // Wait for unlock confirmation
              while (true) {
                walletState = stateChannel.receive()

                if (walletState == lnrpc.Stateservice.WalletState.RPC_ACTIVE) {
                  Log.d(TAG, "Got state: $walletState")
                  return@withTimeoutOrNull true
                }
              }
            }

            else -> continue
          }
        }
      }

      if (result == null) {
        Log.i(TAG, "State timeout reached")
        Log.i(TAG, "Exiting as success")
        saveSyncWorkRecord(SyncResult.FAILURE_STATE_TIMEOUT)
        stopDaemon()
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
        saveSyncWorkRecord(SyncResult.FAILURE_CHAIN_SYNC_TIMEOUT)
        stopDaemon()
        return Result.success()
      }

      delay(1000)

      // Check if MainActivity is running before stopping daemon
      if (isMainActivityRunning()) {
        Log.d(TAG, "MainActivity is running, skipping daemon stop")
        saveSyncWorkRecord(SyncResult.SUCCESS_ACTIVITY_INTERRUPTED)
        return Result.success()
      }

      stopDaemon()

      delay(5000)

      HyperLog.i(TAG, "Sync worker finished");
      HyperLog.i(TAG, "------------------------------------");

      saveSyncWorkRecord(SyncResult.SUCCESS_CHAIN_SYNCED)
      return Result.success()
    } catch (e: Exception) {
      Log.e(TAG, "Fail in Sync Worker", e)
      saveSyncWorkRecord(SyncResult.FAILURE_GENERAL, e.message)
      // try {
      //   stopDaemon()
      // } catch (stopError: Exception) {
      //   Log.e(TAG, "Failed to stop daemon during error handling", stopError)
      // }
      return Result.failure()
    }
  }

  private suspend fun startLnd(): Boolean = suspendCancellableCoroutine { cont ->
    Log.i(TAG, "Starting lnd")
    lnd.startLnd(
      "--nolisten --lnddir=/data/user/0/com.blixtwallet.debug/files/",
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

  private suspend fun stopDaemon() = suspendCancellableCoroutine<Unit> { cont ->
    val emptyRequest = ByteArray(0)
    lnd.stopDaemon(emptyRequest, object : LndCallback {
      override fun onResponse(data: ByteArray) {
        Log.d(TAG, "stopDaemon onResponse")
        cont.resume(Unit) { _, _, _ -> }
      }

      override fun onError(error: String) {
        Log.d(TAG, "stopDaemon onError $error")
        cont.resumeWithException(Exception("stopDaemon failed: $error"))
      }
    })
  }

  private suspend fun unlockWallet() = suspendCancellableCoroutine<Unit> { cont ->
    val keychain = KeychainModule(BridgeReactContext(getApplicationContext()))

    val keychainOptions = Arguments.createMap()
    val keychainOptionsAuthenticationPrompt = Arguments.createMap()
    keychainOptionsAuthenticationPrompt.putString("title", "Authenticate to retrieve secret")
    keychainOptionsAuthenticationPrompt.putString("cancel", "Cancel")
    keychainOptions.putMap("authenticationPrompt", keychainOptionsAuthenticationPrompt)

    keychain.getInternetCredentialsForServer(
      "password",
      keychainOptions,
      object : PromiseWrapper() {
        public override fun onSuccess(value: Any?) {
          if (value == null) {
            HyperLog.e(
              TAG, "Failed to get wallet password, got null from keychain provider"
            )
            cont.resumeWithException(Exception("Unlock failed: value == null"))
            return
          }

          HyperLog.d(TAG, "Password data retrieved from keychain")
          val password = (value as ReadableMap).getString("password")
          HyperLog.d(TAG, "Password retrieved")

          val unlockRequest = lnrpc.Walletunlocker.UnlockWalletRequest.newBuilder()
            .setWalletPassword(ByteString.copyFromUtf8(password))
            .build()
            .toByteArray()

          lnd.unlockWallet(unlockRequest, object : LndCallback {
            override fun onResponse(data: ByteArray) {
              cont.resume(Unit) { _, _, _ -> }
            }

            override fun onError(error: String) {
              Log.e(TAG, "unlockWallet failed $error")
              cont.resumeWithException(Exception("Unlock failed: $error"))
            }
          })
        }

        public override fun onFail(throwable: Throwable) {
          HyperLog.d(TAG, "Failed to get wallet password " + throwable.message, throwable)
          cont.resumeWithException(Exception("Unlock failed: $throwable"))
          return
        }
      })
  }

  private fun isMainActivityRunning(): Boolean {
    // For one-off workers, always return false
    if (tags.contains(ONE_OFF_TAG)) {
      return false
    }

    // For periodic workers, actually check MainActivity status
    val activityManager = 
      getApplicationContext().getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val appTasks = activityManager.appTasks

    return appTasks.any { task ->
      Log.d(TAG, task.taskInfo?.topActivity?.className!!)
      task.taskInfo?.topActivity?.className?.contains("MainActivity") == true
    }
  }
}
