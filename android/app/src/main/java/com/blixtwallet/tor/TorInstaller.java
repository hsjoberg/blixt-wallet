package com.blixtwallet.tor;

import android.content.Context;

import com.msopentech.thali.android.installer.AndroidTorInstaller;
import com.msopentech.thali.toronionproxy.android.R;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.TimeoutException;

public class TorInstaller extends AndroidTorInstaller {
    public TorInstaller(Context context, File configDir) {
        super(context, configDir);
    }

    @Override
    public InputStream openBridgesStream() throws IOException {
        return context.getResources().openRawResource(R.raw.bridges);
    }

    @Override
    public void setup() throws IOException {
        super.setup();
    }
}
