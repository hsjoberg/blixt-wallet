package com.blixtwallet;

import com.blixtwallet.tor.BlixtTorPackage;

import androidx.multidex.MultiDexApplication;
import android.content.Context;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import com.facebook.react.bridge.JSIModulePackage;
import java.lang.reflect.InvocationTargetException;
import java.util.List;
import com.hypertrack.hyperlog.HyperLog;

public class MainApplication extends MultiDexApplication implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
            List<ReactPackage> packages = new PackageList(this).getPackages();
            packages.add(new LndMobilePackage());
            packages.add(new LndMobileToolsPackage());
            packages.add(new GossipFileScheduledSyncPackage());
            packages.add(new LndMobileScheduledSyncPackage());
            packages.add(new BlixtTorPackage());
            packages.add(new RealTimeBlurPackage());
            return packages;
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
    initializeFlipper(this, getReactNativeHost().getReactInstanceManager());

    HyperLog.initialize(this);
    HyperLog.setLogLevel(
      BuildConfig.DEBUG
        ? android.util.Log.VERBOSE
        : android.util.Log.DEBUG
    );

    // Make sure OkHttp is proxied via SOCKS Tor.
    // This makes sure that `fetch` is proxied in Javascript-land.
    // com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory(new OkHttpClientFactory() {
    //   @Override
    //   public OkHttpClient createNewNetworkModuleClient() {
    //     OkHttpClient.Builder okHttpClientBuilder = new OkHttpClient.Builder();
    //     okHttpClientBuilder.proxy(new Proxy(Proxy.Type.SOCKS, new InetSocketAddress("127.0.0.1", 9050)));
    //     okHttpClientBuilder.cookieJar(new ReactCookieJarContainer());
    //     return okHttpClientBuilder.build();
    //   }
    // });
  }

  /**
   * Loads Flipper in React Native templates.
   *
   * @param context
   */
  private static void initializeFlipper(Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.blixtwallet.ReactNativeFlipper");
        aClass
          .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
          .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }
}
