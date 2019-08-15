// package com.blixtwallet;

// import android.util.Log;
// import android.content.Context;

// import java.io.File;
// import java.io.IOException;
// import java.util.ArrayList;
// import java.nio.charset.Charset;

// import com.facebook.react.bridge.Arguments;
// import com.facebook.react.bridge.WritableMap;
// import com.facebook.react.bridge.NativeModule;
// import com.facebook.react.bridge.ReactApplicationContext;
// import com.facebook.react.bridge.ReactContext;
// import com.facebook.react.bridge.ReactContextBaseJavaModule;
// import com.facebook.react.bridge.ReactMethod;
// import com.facebook.react.bridge.Promise;
// import com.facebook.react.modules.core.DeviceEventManagerModule;

// import io.grpc.LightningGrpc.Rpc;
// import io.grpc.LightningGrpc.LightningGrpc.LightningBlockingStub;
// import io.grpc.LightningGrpc.WalletUnlockerGrpc.WalletUnlockerBlockingStub;
// import io.grpc.okhttp.OkHttpChannelBuilder;
// import io.grpc.ManagedChannel;
// import com.google.protobuf.ByteString;
// import com.google.gson.Gson;
// import org.apache.commons.io.input.ReversedLinesFileReader;

// class LndGrpc extends ReactContextBaseJavaModule {
//   private final String TAG = "LndGrpc";
//   private final String HOST = "localhost";
//   private final LndGrpcSecurity lndGrpcSecurity;

//   private boolean invoiceSubscriptionStarted = false;

//   public LndGrpc(ReactApplicationContext reactContext) {
//     super(reactContext);

//     lndGrpcSecurity = new LndGrpcSecurity(reactContext);
//   }

//   @Override
//   public String getName() {
//     return "LndGrpc";
//   }

//   private ManagedChannel createHttpChannel() {
//     return OkHttpChannelBuilder
//       .forAddress(HOST, 10009)
//       .sslSocketFactory(lndGrpcSecurity.getSslContext().getSocketFactory())
//       .build();
//   }

//   private LightningBlockingStub createLightningBlockingStub(ManagedChannel channel) {
//     return io.grpc.LightningGrpc.LightningGrpc.newBlockingStub(channel)
//       .withCallCredentials(lndGrpcSecurity.getMacaroonCallCredentials());
//   }

//   private WalletUnlockerBlockingStub createWalletUnlockerBlockingStub(ManagedChannel channel) {
//     return io.grpc.LightningGrpc.WalletUnlockerGrpc.newBlockingStub(channel)
//       .withCallCredentials(lndGrpcSecurity.getMacaroonCallCredentials());
//   }

//   @ReactMethod
//   void readMacaroon(Promise promise) {
//     if (lndGrpcSecurity.readMacaroon()) {
//       promise.resolve(true);
//       return;
//     }
//     promise.resolve(false);
//   }

//   @ReactMethod
//   void readCertificate(Promise promise) {
//     if (lndGrpcSecurity.readCertificate()) {
//       promise.resolve(true);
//       return;
//     }
//     promise.resolve(false);
//   }

//   @ReactMethod
//   void initWallet(String password, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       WalletUnlockerBlockingStub stub = io.grpc.LightningGrpc.WalletUnlockerGrpc.newBlockingStub(channel);

//       Rpc.GenSeedResponse genSeedResponse = stub.genSeed(Rpc.GenSeedRequest.getDefaultInstance());

//       Rpc.InitWalletResponse response = stub.initWallet(Rpc.InitWalletRequest.newBuilder()
//         .addAllCipherSeedMnemonic(genSeedResponse.getCipherSeedMnemonicList())
//         .setWalletPassword(ByteString.copyFromUtf8(password)).build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void unlockWallet(String password, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       WalletUnlockerBlockingStub stub = createWalletUnlockerBlockingStub(channel);
//       Rpc.UnlockWalletResponse response = stub.unlockWallet(
//         Rpc.UnlockWalletRequest.newBuilder().setWalletPassword(ByteString.copyFromUtf8(password)).build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void getInfo(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.GetInfoResponse response = stub.getInfo(Rpc.GetInfoRequest.getDefaultInstance());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void pendingChannels(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.PendingChannelsResponse response = stub.pendingChannels(Rpc.PendingChannelsRequest.getDefaultInstance());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void listChannels(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.ListChannelsResponse response = stub.listChannels(Rpc.ListChannelsRequest.getDefaultInstance());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void channelBalance(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.ChannelBalanceResponse response = stub.channelBalance(Rpc.ChannelBalanceRequest.getDefaultInstance());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void sendPaymentSync(String paymentRequest, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.SendResponse response = stub.sendPaymentSync(
//         Rpc.SendRequest.newBuilder().setPaymentRequest(paymentRequest).build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void decodePayReq(String bolt11, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.PayReq response = stub.decodePayReq(Rpc.PayReqString.newBuilder().setPayReq(bolt11).build());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void addInvoice(double amount, String memo, double expiry, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);

//       Rpc.Invoice.Builder invoice = Rpc.Invoice.newBuilder();
//       invoice.setValue((long) amount);
//       if (!memo.isEmpty()) {
//         invoice.setMemo(memo);
//       }
//       if (expiry != 0) {
//         invoice.setExpiry((long) expiry);
//       }

//       Rpc.AddInvoiceResponse response = stub.addInvoice(invoice.build());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void lookupInvoice(String rHash, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.Invoice response = stub.lookupInvoice(Rpc.PaymentHash.newBuilder().setRHashStr(rHash).build());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void newAddress(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.NewAddressResponse response = stub.newAddress(
//         Rpc.NewAddressRequest.newBuilder().setType(Rpc.AddressType.WITNESS_PUBKEY_HASH).build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void connectPeer(String pubkey, String host, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.ConnectPeerResponse response = stub.connectPeer(
//         Rpc.ConnectPeerRequest.newBuilder().setAddr(
//           Rpc.LightningAddress.newBuilder().setPubkey(pubkey).setHost(host).build()
//         ).build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void openChannel(String pubkey, double amount, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.ChannelPoint response = stub.openChannelSync(
//           Rpc.OpenChannelRequest.newBuilder()
//             .setNodePubkeyString(pubkey)
//             .setLocalFundingAmount((long) amount)
//             .setMinConfs(1)
//           .build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void stopDaemon(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.StopResponse response = stub.stopDaemon(Rpc.StopRequest.getDefaultInstance());

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void walletBalance(Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.WalletBalanceResponse response = stub.walletBalance(
//         Rpc.WalletBalanceRequest.getDefaultInstance()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void sendCoins(String address, Promise promise) {
//     ManagedChannel channel = null;
//     try {
//       channel = createHttpChannel();
//       LightningBlockingStub stub = createLightningBlockingStub(channel);
//       Rpc.SendCoinsResponse response = stub.sendCoins(
//         Rpc.SendCoinsRequest.newBuilder().setAddr(address).setSendAll(true).build()
//       );

//       String jsonResponse = new Gson().toJson(response);
//       promise.resolve(jsonResponse);
//     } catch (io.grpc.StatusRuntimeException e) {
//       promise.reject(new Gson().toJson(e));
//     } catch(Throwable t) {
//       promise.reject(new Gson().toJson(t));
//     } finally {
//       if (channel != null) {
//         channel.shutdown();
//       }
//     }
//   }

//   @ReactMethod
//   void closeChannel(String fundingTx, double outputIndex, Promise promise) {
//     // TODO needs more testing
//     // What happens when update is completed?
//     // Perhaps SubscribeChannelEvents is needed
//     // instead of emitting messages from this method
//     new Thread(new Runnable() {
//       public void run() {
//         ManagedChannel channel = null;
//         try {
//           channel = createHttpChannel();
//           LightningBlockingStub stub = createLightningBlockingStub(channel);
//           java.util.Iterator<io.grpc.LightningGrpc.Rpc.CloseStatusUpdate> iterator = stub.closeChannel(
//             Rpc.CloseChannelRequest.newBuilder().setChannelPoint(
//               Rpc.ChannelPoint.newBuilder().setFundingTxidStr(fundingTx).setOutputIndex((int) outputIndex)
//             ).build()
//           );

//           Log.i(TAG, "Channel close start");
//           while (iterator.hasNext()) {
//             Rpc.CloseStatusUpdate update = iterator.next();
//             Log.i(TAG, update.getUpdateCase().toString());

//             WritableMap params = Arguments.createMap();
//             params.putString("update", update.getUpdateCase().toString());

//             getReactApplicationContext()
//               .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
//               .emit("channel", params);
//           }
//           Log.i(TAG, "Channel close done");
//         } catch (io.grpc.StatusRuntimeException e) {
//           promise.reject(new Gson().toJson(e));
//         } catch(Throwable t) {
//           promise.reject(new Gson().toJson(t));
//         } finally {
//           if (channel != null) {
//             channel.shutdown();
//           }
//         }
//       }
//     }).start();
//     promise.resolve(true);
//   }

//   @ReactMethod
//   void readLndLog(Promise promise) {
//     ReversedLinesFileReader object = null;
//     try {
//       ArrayList<String> lines = new ArrayList<>();
//       Gson json = new Gson();
//       File file = new File(getReactApplicationContext().getFilesDir().getPath() + "/logs/bitcoin/testnet/lnd.log");

//       object = new ReversedLinesFileReader(file, Charset.forName("UTF-8"));
//       String line;
//       while ((line = object.readLine()) != null) {
//         lines.add(line);
//       }
//       promise.resolve(json.toJson(lines));
//     } catch (IOException e) {
//       promise.reject(e.getMessage());
//     }
//     finally {
//       try {
//         object.close();
//       } catch (IOException e) {
//         promise.reject(e.getMessage());
//       }
//     }
//   }

//   @ReactMethod
//   void startInvoiceSubscription() {
//     if (invoiceSubscriptionStarted) {
//       Log.w(TAG, "WARNING: tried to call startInvoiceSubscription when it is already started");
//       return;
//     }

//     Log.i("LndGrpc", "startInvoiceSubscription");
//     new Thread(new Runnable() {
//       public void run() {
//         Log.i("LndGrpc", "Invoice Subscription thread");
//         String threadName = Thread.currentThread().getName();

//         ManagedChannel channel = null;
//         try {
//           channel = createHttpChannel();
//           LightningBlockingStub stub = createLightningBlockingStub(channel);

//           java.util.Iterator<io.grpc.LightningGrpc.Rpc.Invoice> iterator = stub.subscribeInvoices(
//             Rpc.InvoiceSubscription.getDefaultInstance()
//           );

//           Log.i(TAG, "startInvoiceSubscription starting");
//           invoiceSubscriptionStarted = true;
//           while (iterator.hasNext()) {
//               Rpc.Invoice invoice = iterator.next();

//               WritableMap params = Arguments.createMap();
//               params.putString("description", invoice.getMemo());
//               params.putDouble("amtPaidSat", invoice.getAmtPaidSat());
//               params.putDouble("value", invoice.getValue());
//               params.putDouble("date", invoice.getCreationDate());
//               params.putString("paymentRequest", invoice.getPaymentRequest());
//               params.putString("state", invoice.getState().toString());

//               getReactApplicationContext()
//                 .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
//                 .emit("invoice", params);
//           }
//           invoiceSubscriptionStarted = false;
//           Log.i(TAG, "startInvoiceSubscription done. Perhaps lnd was killed?");

//         } catch (io.grpc.StatusRuntimeException e) {
//           Log.e(TAG, "subscribeInvoices failed: " + e.getMessage());
//           //promise.reject(new Gson().toJson(e));
//         } catch(Throwable t) {
//           Log.e(TAG, "subscribeInvoices failed: " + t.getMessage());
//           //promise.reject(new Gson().toJson(t));
//         } finally {
//           if (channel != null) {
//             channel.shutdown();
//           }
//         }
//       }
//     }).start();
//   }
// }
