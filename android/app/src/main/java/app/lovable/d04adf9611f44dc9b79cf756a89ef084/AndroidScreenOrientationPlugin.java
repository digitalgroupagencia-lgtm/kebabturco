package app.lovable.d04adf9611f44dc9b79cf756a89ef084;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidScreenOrientation")
public class AndroidScreenOrientationPlugin extends Plugin {
    @PluginMethod
    public void setOrientation(final PluginCall call) {
        final String orientation = call.getString("orientation", "unspecified");
        final Activity activity = getActivity();

        if (activity == null) {
            call.reject("Activity indisponível");
            return;
        }

        activity.runOnUiThread(() -> {
            if ("portrait".equals(orientation)) {
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            } else if ("landscape".equals(orientation)) {
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            } else {
                activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            }

            JSObject result = new JSObject();
            result.put("orientation", orientation);
            call.resolve(result);
        });
    }
}