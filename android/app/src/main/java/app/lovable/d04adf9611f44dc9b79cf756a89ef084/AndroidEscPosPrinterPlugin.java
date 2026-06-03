package app.lovable.d04adf9611f44dc9b79cf756a89ef084;

import android.util.Base64;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedOutputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

@CapacitorPlugin(name = "AndroidEscPosPrinter")
public class AndroidEscPosPrinterPlugin extends Plugin {
    private static final String TAG = "AndroidPrint";
    private static final int CONNECT_TIMEOUT_MS = 10000;
    private static final int SO_TIMEOUT_MS = 15000;

    @PluginMethod
    public void printEscPos(final PluginCall call) {
        final String host = call.getString("host");
        final Integer port = call.getInt("port", 9100);
        final String base64 = call.getString("base64");
        final Integer copies = Math.max(1, call.getInt("copies", 1));

        if (host == null || host.trim().isEmpty()) {
            call.reject("host é obrigatório");
            return;
        }
        if (base64 == null || base64.isEmpty()) {
            call.reject("base64 é obrigatório");
            return;
        }

        new Thread(() -> {
            try {
                Log.d(TAG, "AndroidEscPosPrinter printEscPos host=" + host + " port=" + port + " copies=" + copies);
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
                    socket.setSoTimeout(SO_TIMEOUT_MS);

                    OutputStream output = new BufferedOutputStream(socket.getOutputStream());
                    for (int i = 0; i < copies; i++) {
                        output.write(bytes);
                        output.flush();
                    }
                }

                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("bytes", bytes.length);
                result.put("copies", copies);
                call.resolve(result);
                Log.d(TAG, "AndroidEscPosPrinter printEscPos success bytes=" + bytes.length);
            } catch (Exception e) {
                Log.e(TAG, "AndroidEscPosPrinter printEscPos failed: " + e.getMessage(), e);
                call.reject("AndroidEscPosPrinter failed: " + e.getMessage(), e);
            }
        }).start();
    }
}