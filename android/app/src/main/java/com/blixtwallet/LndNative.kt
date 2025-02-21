package com.blixtwallet

class LndNative {
//    companion object {
//        init {
//            System.loadLibrary("lnd") // Loads liblnd.so
//        }
//    }

    // Native method declarations (see LndJNI.cpp)
    external fun startLnd(extraArgs: String, callback: LndCallback)
    external fun getInfo(request: ByteArray, callback: LndCallback)
    external fun unlockWallet(request: ByteArray, callback: LndCallback)
    external fun stopDaemon(request: ByteArray, callback: LndCallback)
    external fun subscribeState(request: ByteArray, listener: LndStreamListener)
    external fun getStatus(): Int
}
