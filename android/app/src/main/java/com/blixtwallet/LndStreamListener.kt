package com.blixtwallet

interface LndStreamListener {
    fun onResponse(data: ByteArray)
    fun onError(error: String)
}
