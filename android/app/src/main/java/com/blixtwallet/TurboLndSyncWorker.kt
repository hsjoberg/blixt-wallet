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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resumeWithException

private const val TAG = "TurboLndSyncWorker"

class TurboLndSyncWorker(
  context: Context,
  params: WorkerParameters
) : CoroutineWorker(context, params) {

  private val lnd = LndNative()
  private val stateChannel = Channel<lnrpc.Stateservice.WalletState>(Channel.UNLIMITED)

  override suspend fun doWork(): Result {
    return try {
      // Bail out immediately if MainActivity is running
      if (isMainActivityRunning()) {
        Log.d(TAG, "MainActivity is running, skipping daemon stop")
        return Result.success()
      }

      Log.i(TAG, "------------------------------------");
      Log.i(TAG, "Starting sync worker");
      Log.i(TAG, "I am " + getApplicationContext().getPackageName());
      val isAlreadyRunning = startLnd()

      if (isAlreadyRunning) {
        Log.d(TAG, "LND already running, marking work as success")
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
        return Result.success()
      }

      // Poll until chain is synced or timeout reached
      Log.i(TAG, "Waiting for chain sync")
      val chainSynced = withTimeoutOrNull(30_000) {
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
      }

      delay(1000)

      // Check if MainActivity is running before stopping daemon
      if (isMainActivityRunning()) {
        Log.d(TAG, "MainActivity is running, skipping daemon stop")
        return Result.success()
      }

      stopDaemon()

      delay(5000)

      HyperLog.i(TAG, "Sync worker finished");
      HyperLog.i(TAG, "------------------------------------");

      Result.success()
    } catch (e: Exception) {
      Log.e(TAG, "Fail in Sync Worker", e)
      Result.failure()
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
    return false; // TODO remove once we're done testing

    val activityManager =
      getApplicationContext().getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val appTasks = activityManager.appTasks

    return appTasks.any { task ->
      Log.d(TAG, task.taskInfo?.topActivity?.className!!)
      task.taskInfo?.topActivity?.className?.contains("MainActivity") == true
    }
  }
}
