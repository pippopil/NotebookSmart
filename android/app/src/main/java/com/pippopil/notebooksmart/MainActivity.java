package com.pippopil.notebooksmart;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;

    private String pendingSharedText = null;
    private String pendingSharedSubject = null;
    private String pendingAction = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIncomingIntent(getIntent());
        requestPermissionsIfNeeded();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
        notifyWebOfPendingEvents();
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(intent.getType())) {
            this.pendingSharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            this.pendingSharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        } else if (Intent.ACTION_VIEW.equals(action)) {
            Uri data = intent.getData();
            if (data != null && "notebooksmart".equalsIgnoreCase(data.getScheme())) {
                String path = data.getPath(); // e.g. /shopping, /new-note, /calc, /event
                if (path != null && path.length() > 1) {
                    this.pendingAction = path.substring(1);
                } else if (data.getHost() != null) {
                    this.pendingAction = data.getHost();
                }
            }
        }
    }

    public synchronized String getAndClearPendingSharedContent() {
        if (pendingSharedText == null) return null;
        try {
            JSONObject obj = new JSONObject();
            obj.put("text", pendingSharedText);
            obj.put("title", pendingSharedSubject != null ? pendingSharedSubject : "");
            pendingSharedText = null;
            pendingSharedSubject = null;
            return obj.toString();
        } catch (Exception e) {
            return null;
        }
    }

    public synchronized String getAndClearPendingAction() {
        String act = pendingAction;
        pendingAction = null;
        return act;
    }

    public void notifyWebOfPendingEvents() {
        try {
            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                WebView webView = this.getBridge().getWebView();
                webView.post(() -> {
                    if (pendingSharedText != null) {
                        try {
                            String text = pendingSharedText.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
                            String title = (pendingSharedSubject != null ? pendingSharedSubject : "").replace("'", "\\'");
                            webView.evaluateJavascript(
                                "if (window.onNativeSharedContent) { window.onNativeSharedContent('" + title + "', '" + text + "'); }",
                                null
                            );
                            pendingSharedText = null;
                            pendingSharedSubject = null;
                        } catch (Exception ignored) {}
                    }
                    if (pendingAction != null) {
                        try {
                            String act = pendingAction.replace("'", "\\'");
                            webView.evaluateJavascript(
                                "if (window.onNativeAction) { window.onNativeAction('" + act + "'); }",
                                null
                            );
                            pendingAction = null;
                        } catch (Exception ignored) {}
                    }
                });
            }
        } catch (Exception ignored) {}
    }

    private void requestPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> permissionsToRequest = new ArrayList<>();

            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            }

            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
            }

            // Android 13+ Notification permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }

            if (!permissionsToRequest.isEmpty()) {
                ActivityCompat.requestPermissions(
                    this,
                    permissionsToRequest.toArray(new String[0]),
                    PERMISSION_REQUEST_CODE
                );
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        try {
            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                WebView webView = this.getBridge().getWebView();
                WebSettings settings = webView.getSettings();
                settings.setGeolocationEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setDomStorageEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Register Enhanced Hybrid JavaScript Bridge
                webView.addJavascriptInterface(new AndroidNativeBridge(this), "AndroidNative");

                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                        requestPermissionsIfNeeded();
                        callback.invoke(origin, true, false);
                    }

                    @Override
                    public void onPermissionRequest(final android.webkit.PermissionRequest request) {
                        runOnUiThread(() -> {
                            try {
                                request.grant(request.getResources());
                            } catch (Exception ignored) {}
                        });
                    }
                });

                notifyWebOfPendingEvents();
            }

            // Refresh home screen widget
            NotebookWidgetProvider.updateAllWidgets(this);
        } catch (Exception ignored) {}
    }
}
