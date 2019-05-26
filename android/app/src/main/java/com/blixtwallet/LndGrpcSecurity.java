package com.blixtwallet;

import android.content.Context;
import android.content.res.Resources;
//import android.support.v7.app.AppCompatActivity;
import android.util.Log;

import org.apache.commons.codec.binary.Hex;
import org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.Executor;

import javax.net.ssl.SSLContext;

import io.grpc.CallCredentials;
import io.grpc.Metadata;
import io.grpc.Status;

class LndGrpcSecurity {
  private String adminMacaroonHex;
  private SSLContext sslContext;

  LndGrpcSecurity(Context context) {
    try {
      Resources res = context.getResources();
      Log.i("MainActivity", String.valueOf(res.getIdentifier("admin", "raw", context.getPackageName())));
      InputStream adminMacaroonResource = res.openRawResource(res.getIdentifier("admin", "raw", context.getPackageName()));
      byte[] adminByte = IOUtils.toByteArray(adminMacaroonResource);
      adminMacaroonHex = Hex.encodeHexString(adminByte);

      InputStream certResource = res.openRawResource(res.getIdentifier("tls", "raw", context.getPackageName()));
      sslContext = SslUtils.getSslContextForCertificateFile(certResource);
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  SSLContext getSslContext() {
    return sslContext;
  }

  String getMacaroonHex() {
    return adminMacaroonHex;
  }

  CallCredentials getMacaroonCallCredentials() {
    return new CallCredentials() {
      @Override
      public void applyRequestMetadata(CallCredentials.RequestInfo requestInfo, Executor appExecutor,
          final CallCredentials.MetadataApplier applier) {
        appExecutor.execute(new Runnable() {
          @Override
          public void run() {
            try {
              Metadata headers = new Metadata();
              Metadata.Key<String> clientIdKey = Metadata.Key.of("macaroon", Metadata.ASCII_STRING_MARSHALLER);
              headers.put(clientIdKey, adminMacaroonHex);
              applier.apply(headers);
            } catch (Throwable ex) {
              applier.fail(Status.UNAUTHENTICATED.withCause(ex));
            }
          }
        });
      }

      @Override
      public void thisUsesUnstableApi() {
      }
    };
  }
}
