// https://gist.github.com/mklimek/f9d197362c1f2db8c1b76f76ace75859
package com.blixtwallet;


//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;

import java.io.FileInputStream;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;

class SslUtils {
    public static SSLContext getSslContextForCertificateFile(InputStream inputStream) {
        try {
            KeyStore keyStore = SslUtils.getKeyStore(inputStream);
            SSLContext sslContext = SSLContext.getInstance("SSL");
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            trustManagerFactory.init(keyStore);
            sslContext.init(null, trustManagerFactory.getTrustManagers(), new SecureRandom());
            return sslContext;
        } catch (Exception e) {
            String msg = "Cannot load certificate from file";
            throw new RuntimeException(msg);
        }
    }

    private static KeyStore getKeyStore(InputStream inputStream) {
        KeyStore keyStore = null;
        try {
            CertificateFactory cf = CertificateFactory.getInstance("X.509");

            Certificate ca;
            try {
                ca = cf.generateCertificate(inputStream);
            } finally {
                inputStream.close();
            }

            String keyStoreType = KeyStore.getDefaultType();
            keyStore = KeyStore.getInstance(keyStoreType);
            keyStore.load(null, null);
            keyStore.setCertificateEntry("ca", ca);
        } catch (Exception e) {
        }
        return keyStore;
    }
}
