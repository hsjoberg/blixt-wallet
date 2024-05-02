package com.blixtwallet

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Promise
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import dev.doubledot.doki.ui.DokiActivity
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.io.InputStream
import java.lang.ref.WeakReference

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String? {
        return "BlixtWallet"
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [ ] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
                this,
                mainComponentName!!,  // If you opted-in for the New Architecture, we enable the Fabric Renderer.
                fabricEnabled)
    }

    // react-native-screens override
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        currentActivity = WeakReference(this@MainActivity)
        started = true
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if ((requestCode == INTENT_COPYLNDLOG || requestCode == INTENT_COPYSPEEDLOADERLOG) && resultCode == RESULT_OK) {
            val destUri = data!!.data
            val sourceLocation = if (requestCode == INTENT_COPYLNDLOG) File(filesDir.toString() + "/logs/bitcoin/" + BuildConfig.CHAIN + "/lnd.log") else File("$cacheDir/log/speedloader.log")
            try {
                val `in`: InputStream = FileInputStream(sourceLocation)
                val out = contentResolver.openOutputStream(destUri!!)
                val buf = ByteArray(1024)
                var len: Int
                while (`in`.read(buf).also { len = it } > 0) {
                    out!!.write(buf, 0, len)
                }
                `in`.close()
                out!!.close()
            } catch (e: IOException) {
                Toast.makeText(this, "Error " + e.message, Toast.LENGTH_LONG).show()
            }
        } else if (requestCode == INTENT_EXPORTCHANBACKUP && resultCode == RESULT_OK) {
            val destUri = data!!.data
            try {
                val `in` = ByteArrayInputStream(tmpChanBackup)
                val out = contentResolver.openOutputStream(destUri!!)
                val buf = ByteArray(1024)
                var len: Int
                while (`in`.read(buf).also { len = it } > 0) {
                    out!!.write(buf, 0, len)
                }
                `in`.close()
                out!!.close()
                tmpChanBackup = ByteArray(0)
            } catch (e: IOException) {
                e.printStackTrace()
            }
        } else if (requestCode == INTENT_EXPORTCHANBACKUPFILE && resultCode == RESULT_OK) {
            val destUri = data!!.data
            val sourceLocation = File(filesDir.toString() + "/data/chain/bitcoin/" + BuildConfig.CHAIN + "/channel.backup")
            try {
                val `in`: InputStream = FileInputStream(sourceLocation)
                val out = contentResolver.openOutputStream(destUri!!)
                val buf = ByteArray(1024)
                var len: Int
                while (`in`.read(buf).also { len = it } > 0) {
                    out!!.write(buf, 0, len)
                }
                `in`.close()
                out!!.close()
            } catch (e: IOException) {
                Toast.makeText(this, "Error " + e.message, Toast.LENGTH_LONG).show()
            }
        } else if (requestCode == INTENT_EXPORTCHANNELDBFILE && resultCode == RESULT_OK) {
            val destUri = data!!.data
            val sourceLocation = File(filesDir.toString() + "/data/graph/" + BuildConfig.CHAIN + "/channel.db")
            try {
                val `in`: InputStream = FileInputStream(sourceLocation)
                val out = contentResolver.openOutputStream(destUri!!)
                val buf = ByteArray(1024)
                var len: Int
                while (`in`.read(buf).also { len = it } > 0) {
                    out!!.write(buf, 0, len)
                }
                `in`.close()
                out!!.close()

                if (tmpExportChannelDbPromise != null) {
                    Toast.makeText(this, "promise is not null", Toast.LENGTH_LONG).show()
                    tmpExportChannelDbPromise!!.resolve(true)
                } else {
                    Toast.makeText(this, "promise is null", Toast.LENGTH_LONG).show()
                }
            } catch (e: IOException) {
                Toast.makeText(this, "Error " + e.message, Toast.LENGTH_LONG).show()
                tmpExportChannelDbPromise!!.reject(e)
            }
        }
    }

    fun showMsg() {
        startActivity(Intent(this@MainActivity, DokiActivity::class.java))
    }

    companion object {
        /**
         * Blixt stuff here:
         */
        var TAG = "MainActivity"
        @JvmField
        var started = false
        @JvmField
        var INTENT_COPYLNDLOG = 100
        @JvmField
        var INTENT_EXPORTCHANBACKUP = 101
        @JvmField
        var tmpChanBackup: ByteArray = ByteArray(0)
        @JvmField
        var INTENT_EXPORTCHANBACKUPFILE = 102
        @JvmField
        var INTENT_COPYSPEEDLOADERLOG = 103
        @JvmField
        var INTENT_EXPORTCHANNELDBFILE = 104
        @JvmField
        var tmpExportChannelDbPromise: Promise? = null
        @JvmField
        var currentActivity: WeakReference<MainActivity>? = null
        @JvmStatic
        val activity: MainActivity?
            get() = currentActivity!!.get()
    }
}