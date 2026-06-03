package app.lovable.d04adf9611f44dc9b79cf756a89ef084;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.svend.plugins.tcp.socket.TcpSocketPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Registro explícito para garantir que o APK Android inclua o plugin TCP,
        // mesmo se o auto-registro do Capacitor falhar ou o schema de plugins estiver antigo.
        registerPlugin(TcpSocketPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
