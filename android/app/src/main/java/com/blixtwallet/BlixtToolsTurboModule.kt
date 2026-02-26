package com.blixtwallet

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class BlixtToolsTurboModule(private val appContext: ReactApplicationContext) :
  NativeBlixtToolsSpec(appContext) {
  override fun getName() = NAME

  @Volatile private var gossipSyncCancelled = false
  @Volatile private var activeConnection: HttpURLConnection? = null
  @Volatile private var gossipSyncInProgress = false
  private val gossipSyncLock = Any()
  private val logLock = Any()

  override fun startSyncWorker() {}

  override fun scheduleSyncWorker() {}

  override fun stopScheduleSyncWorker() {}

  override fun getStatus(): Double {
    return 0.0
    // val lnd = LndNative()
    // return lnd.getStatus().toDouble()
  }

  override fun gossipSync(serviceUrl: String, promise: Promise) {
    synchronized(gossipSyncLock) {
      if (gossipSyncInProgress) {
        promise.reject("GOSSIP_SYNC_IN_PROGRESS", "Gossip sync is already in progress")
        return
      }
      gossipSyncInProgress = true
    }
    gossipSyncCancelled = false

    Thread {
      var tempGraphDbFile: File? = null
      val lastRunFile = File(appContext.cacheDir, LAST_RUN_FILE_NAME)
      try {
        logLine("gossipSync started with serviceUrl=$serviceUrl")

        if (shouldSkipGossipSync(lastRunFile)) {
          logLine("gossipSync skipped due to 24h time constraint")
          promise.resolve(null)
          return@Thread
        }

        val graphDir = File(appContext.filesDir, "data/graph/${BuildConfig.CHAIN}")
        if (!graphDir.exists() && !graphDir.mkdirs()) {
          throw IOException("Failed to create graph directory: ${graphDir.absolutePath}")
        }

        val graphDbFile = File(graphDir, "graph.db")
        val backupGraphDbFile = File(graphDir, "graph.db.bak")
        tempGraphDbFile = File(graphDir, "graph.db.download")

        if (tempGraphDbFile.exists() && !tempGraphDbFile.delete()) {
          throw IOException("Failed to clear previous temporary graph.db file")
        }

        val graphDbUrl = resolveGraphDbUrl(serviceUrl)
        logLine("Downloading graph database from $graphDbUrl")
        val connection = (URL(graphDbUrl).openConnection() as HttpURLConnection).apply {
          requestMethod = "GET"
          connectTimeout = 15000
          readTimeout = 120000
          doInput = true
          instanceFollowRedirects = true
        }
        activeConnection = connection

        connection.connect()
        val statusCode = connection.responseCode
        if (statusCode !in 200..299) {
          throw IOException("Failed to download graph.db, HTTP $statusCode")
        }

        connection.inputStream.use { input ->
          FileOutputStream(tempGraphDbFile).use { output ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
              ensureNotCancelled()
              val read = input.read(buffer)
              if (read == -1) {
                break
              }
              output.write(buffer, 0, read)
            }
            output.fd.sync()
          }
        }
        ensureNotCancelled()

        if (!tempGraphDbFile.exists() || tempGraphDbFile.length() == 0L) {
          throw IOException("Downloaded graph.db is empty")
        }
        logLine("Downloaded graph database (${tempGraphDbFile.length()} bytes)")

        if (backupGraphDbFile.exists() && !backupGraphDbFile.delete()) {
          throw IOException("Failed to remove previous graph.db backup")
        }
        if (graphDbFile.exists() && !graphDbFile.renameTo(backupGraphDbFile)) {
          throw IOException("Failed to create graph.db backup")
        }

        if (!tempGraphDbFile.renameTo(graphDbFile)) {
          if (backupGraphDbFile.exists()) {
            backupGraphDbFile.renameTo(graphDbFile)
          }
          throw IOException("Failed to replace graph.db")
        }

        if (backupGraphDbFile.exists()) {
          backupGraphDbFile.delete()
        }
        touchLastRun(lastRunFile)
        logLine("gossipSync completed successfully")
        promise.resolve(null)
      } catch (e: Exception) {
        if (tempGraphDbFile?.exists() == true) {
          tempGraphDbFile.delete()
        }
        if (gossipSyncCancelled || e.message == CANCELLATION_MESSAGE) {
          logLine("gossipSync cancelled by user")
          promise.reject("GOSSIP_SYNC_CANCELLED", CANCELLATION_MESSAGE, e)
        } else {
          logLine("gossipSync failed: ${e.message ?: "unknown error"}")
          promise.reject("GOSSIP_SYNC_FAILED", e.message ?: "Unknown gossip sync failure", e)
        }
      } finally {
        activeConnection?.disconnect()
        activeConnection = null
        gossipSyncCancelled = false
        synchronized(gossipSyncLock) {
          gossipSyncInProgress = false
        }
      }
    }.start()
  }

  override fun cancelGossipSync() {
    gossipSyncCancelled = true
    activeConnection?.disconnect()
  }

  private fun ensureNotCancelled() {
    if (gossipSyncCancelled) {
      throw IOException(CANCELLATION_MESSAGE)
    }
  }

  private fun shouldSkipGossipSync(lastRunFile: File): Boolean {
    if (!lastRunFile.exists()) {
      lastRunFile.parentFile?.mkdirs()
      if (!lastRunFile.createNewFile()) {
        throw IOException("Failed to create last-run marker file")
      }
      return false
    }

    val elapsedMillis = System.currentTimeMillis() - lastRunFile.lastModified()
    return elapsedMillis <= LAST_RUN_INTERVAL_MS
  }

  private fun touchLastRun(lastRunFile: File) {
    if (!lastRunFile.exists()) {
      lastRunFile.parentFile?.mkdirs()
      if (!lastRunFile.createNewFile()) {
        throw IOException("Failed to create last-run marker file")
      }
    }
    if (!lastRunFile.setLastModified(System.currentTimeMillis())) {
      throw IOException("Failed to update last-run marker file")
    }
  }

  // Accept either a base service URL (append /<chain>/graph/graph-001d.db)
  // or a direct .db URL passed from settings/debug tooling.
  private fun resolveGraphDbUrl(serviceUrl: String): String {
    val trimmedServiceUrl = serviceUrl.trim().trimEnd('/')
    if (trimmedServiceUrl.substringBefore('?').endsWith(".db")) {
      return trimmedServiceUrl
    }
    val networkType = BuildConfig.CHAIN.lowercase()
    return "$trimmedServiceUrl/$networkType/graph/graph-001d.db"
  }

  private fun logLine(message: String) {
    synchronized(logLock) {
      try {
        val logDir = File(appContext.cacheDir, LOG_DIR_NAME)
        if (!logDir.exists()) {
          logDir.mkdirs()
        }
        val logFile = File(logDir, LOG_FILE_NAME)
        val timestamp =
          SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
          }.format(Date())
        FileOutputStream(logFile, true).bufferedWriter(Charsets.UTF_8).use { writer ->
          writer.append(timestamp)
          writer.append(" ")
          writer.append(message)
          writer.newLine()
        }
      } catch (_: IOException) {}
    }
  }

  companion object {
    const val NAME = "BlixtTools"
    private const val CANCELLATION_MESSAGE = "Gossip sync cancelled by user"
    private const val LOG_DIR_NAME = "log"
    private const val LOG_FILE_NAME = "speedloader.log"
    private const val LAST_RUN_FILE_NAME = "lastrun"
    private const val LAST_RUN_INTERVAL_MS = 24L * 60L * 60L * 1000L
  }
}
