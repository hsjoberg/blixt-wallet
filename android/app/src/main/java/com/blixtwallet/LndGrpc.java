package com.blixtwallet;

import android.util.Log;
import android.content.Context;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import io.grpc.LightningGrpc.Rpc;
import io.grpc.LightningGrpc.LightningGrpc.LightningBlockingStub;
import io.grpc.LightningGrpc.WalletUnlockerGrpc.WalletUnlockerBlockingStub;
import io.grpc.okhttp.OkHttpChannelBuilder;
import io.grpc.ManagedChannel;
import com.google.protobuf.ByteString;

import com.google.gson.Gson;

class LndGrpc extends ReactContextBaseJavaModule {
  private final LndGrpcSecurity lndGrpcSecurity;

  public LndGrpc(ReactApplicationContext reactContext) {
    super(reactContext);
    lndGrpcSecurity = new LndGrpcSecurity(reactContext);
  }

  @Override
  public String getName() {
    return "LndGrpc";
  }

  private ManagedChannel createChannel() {
    return OkHttpChannelBuilder
      .forAddress("192.168.1.100", 10009)
      .sslSocketFactory(lndGrpcSecurity.getSslContext().getSocketFactory())
      .build();
  }

  private LightningBlockingStub createLightningBlockingStub(ManagedChannel channel) {
    return io.grpc.LightningGrpc.LightningGrpc.newBlockingStub(channel)
      .withCallCredentials(lndGrpcSecurity.getMacaroonCallCredentials());
  }

  private WalletUnlockerBlockingStub createWalletUnlockerBlockingStub(ManagedChannel channel) {
    return io.grpc.LightningGrpc.WalletUnlockerGrpc.newBlockingStub(channel)
      .withCallCredentials(lndGrpcSecurity.getMacaroonCallCredentials());
  }

  @ReactMethod
  void unlockWallet(String password, Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      WalletUnlockerBlockingStub stub = createWalletUnlockerBlockingStub(channel);
      Rpc.UnlockWalletResponse response = stub.unlockWallet(
        Rpc.UnlockWalletRequest.newBuilder().setWalletPassword(ByteString.copyFromUtf8(password)).build()
      );
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }

  @ReactMethod
  void getInfo(Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      LightningBlockingStub stub = createLightningBlockingStub(channel);
      Rpc.GetInfoResponse response = stub.getInfo(Rpc.GetInfoRequest.getDefaultInstance());
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }

  @ReactMethod
  void pendingChannels(Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      LightningBlockingStub stub = createLightningBlockingStub(channel);
      Rpc.PendingChannelsResponse response = stub.pendingChannels(Rpc.PendingChannelsRequest.getDefaultInstance());
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }

  @ReactMethod
  void listChannels(Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      LightningBlockingStub stub = createLightningBlockingStub(channel);
      Rpc.ListChannelsResponse response = stub.listChannels(Rpc.ListChannelsRequest.getDefaultInstance());
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }

  @ReactMethod
  void channelBalance(Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      LightningBlockingStub stub = createLightningBlockingStub(channel);
      Rpc.ChannelBalanceResponse response = stub.channelBalance(Rpc.ChannelBalanceRequest.getDefaultInstance());
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }

  @ReactMethod
  void sendPaymentSync(String paymentRequest, Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      LightningBlockingStub stub = createLightningBlockingStub(channel);
      Rpc.SendResponse response = stub.sendPaymentSync(
        Rpc.SendRequest.newBuilder().setPaymentRequest(paymentRequest).build()
      );
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }

  @ReactMethod
  void decodePayReq(String bolt11, Promise promise) {
    ManagedChannel channel = null;
    try {
      channel = createChannel();
      LightningBlockingStub stub = createLightningBlockingStub(channel);
      Rpc.PayReq response = stub.decodePayReq(Rpc.PayReqString.newBuilder().setPayReq(bolt11).build());
      String jsonResponse = new Gson().toJson(response);

      promise.resolve(jsonResponse);
    } catch (io.grpc.StatusRuntimeException e) {
      promise.reject(new Gson().toJson(e));
    } catch(Throwable t) {
      promise.reject(new Gson().toJson(t));
    } finally {
      if (channel != null) {
        channel.shutdown();
      }
    }
  }
}
