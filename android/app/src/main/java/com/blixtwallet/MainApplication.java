package com.blixtwallet;

import android.app.Application;
import android.support.v7.app.AppCompatActivity;
import android.content.res.Resources;

import com.facebook.react.ReactApplication;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.horcrux.svg.SvgPackage;
import org.reactnative.camera.RNCameraPackage;
import org.pgsqlite.SQLitePluginPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

import android.util.Log;


// gRPC:
import java.io.InputStream;
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.io.IOUtils;
import io.grpc.LightningGrpc.Rpc.GetInfoRequest;
import io.grpc.LightningGrpc.Rpc.GetInfoResponse;
import javax.net.ssl.SSLContext;
import io.grpc.okhttp.OkHttpChannelBuilder;
import io.grpc.LightningGrpc.LightningGrpc.LightningBlockingStub;
import io.grpc.CallCredentials;
import io.grpc.ManagedChannel;
import io.grpc.Metadata;
import io.grpc.Status;
import java.util.concurrent.Executor;


public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new AsyncStoragePackage(),
            new RNGestureHandlerPackage(),
            new LinearGradientPackage(),
            new SvgPackage(),
            new RNCameraPackage(),
            new SQLitePluginPackage(),
            new LndGrpcPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
