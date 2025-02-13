package com.blixtwallet

interface LndCallback {
    fun onResponse(data: ByteArray)
    fun onError(error: String)
}
