// package com.blixtwallet;

// import android.content.Context;
// import android.content.res.Resources;
// import android.util.Log;

// import org.apache.commons.codec.binary.Hex;
// import org.apache.commons.io.IOUtils;

// import java.io.IOException;
// import java.io.InputStream;
// import java.io.FileInputStream;
// import java.io.BufferedInputStream;
// import java.io.File;
// import java.io.FileNotFoundException;
// import java.util.concurrent.Executor;

// import javax.net.ssl.SSLContext;

// import io.grpc.CallCredentials;
// import io.grpc.Metadata;
// import io.grpc.Status;

// class LndGrpcSecurity {
//   private static final String TAG = "LndGrpcSecurity";
//   private Context context;
//   private String adminMacaroonHex = null;
//   private SSLContext sslContext = null;

//   LndGrpcSecurity(Context ctx) {
//     context = ctx;
//   }

//   public boolean readMacaroon() {
//     if (adminMacaroonHex != null) return true;

//     try {
//       Resources res = context.getResources();
//       InputStream adminMacaroonResource = openInputStreamFromFile(
//         new File(context.getFilesDir().getPath() + "/data/chain/bitcoin/testnet/admin.macaroon")
//       );
//       if (adminMacaroonResource == null) {
//         Log.e(TAG, "adminMacaroonHex is null");
//         return false;
//       }
//       else {
//         byte[] adminByte = IOUtils.toByteArray(adminMacaroonResource);
//         adminMacaroonHex = Hex.encodeHexString(adminByte);
//         Log.i(TAG, adminMacaroonHex);
//       }
//     }
//     catch (IOException e) {
//       e.printStackTrace();
//       Log.e(TAG, e.getMessage());
//       return false;
//     }

//     return true;
//   }

//   public boolean readCertificate() {
//     if (sslContext != null) return true;

//     try {
//       InputStream certResource = openInputStreamFromFile(
//         new File(context.getFilesDir().getPath() + "/tls.cert")
//       );
//       if (certResource == null) {
//         Log.e(TAG, "certResource is null");
//         return false;
//       }
//       else {
//         sslContext = SslUtils.getSslContextForCertificateFile(certResource);
//         Log.i(TAG, sslContext.toString());
//       }
//     }
//     catch (IOException e) {
//       e.printStackTrace();
//       Log.e(TAG, e.getMessage());
//       return false;
//     }

//     return true;
//   }

//   private InputStream openInputStreamFromFile(File file) throws FileNotFoundException {
//     if (!file.exists()) {
//       Log.i("MainActivity", "NO FILE");
//       return null;
//       // throw new Error("File doesn't exist");
//     }
//     return new BufferedInputStream(new FileInputStream(file));
//   }

//   SSLContext getSslContext() {
//     return sslContext;
//   }

//   String getMacaroonHex() {
//     return adminMacaroonHex;
//   }

//   CallCredentials getMacaroonCallCredentials() {
//     return new CallCredentials() {
//       @Override
//       public void applyRequestMetadata(CallCredentials.RequestInfo requestInfo, Executor appExecutor,
//         final CallCredentials.MetadataApplier applier) {
//           appExecutor.execute(new Runnable() {
//             @Override
//             public void run() {
//               try {
//                 Metadata headers = new Metadata();
//                 Metadata.Key<String> clientIdKey = Metadata.Key.of("macaroon", Metadata.ASCII_STRING_MARSHALLER);
//                 headers.put(clientIdKey, adminMacaroonHex);
//                 applier.apply(headers);
//               } catch (Throwable ex) {
//                 applier.fail(Status.UNAUTHENTICATED.withCause(ex));
//               }
//             }
//           }
//         );
//       }

//       @Override
//       public void thisUsesUnstableApi() {
//       }
//     };
//   }
// }
