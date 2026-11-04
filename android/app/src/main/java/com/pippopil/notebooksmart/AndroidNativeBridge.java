package com.pippopil.notebooksmart;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class AndroidNativeBridge {
    private final Activity activity;

    public AndroidNativeBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean isNativeAndroid() {
        return true;
    }

    @JavascriptInterface
    public String getNativeVersion() {
        return "Enhanced-Hybrid v1.9.5";
    }

    /**
     * Native tactile haptic feedback with multiple intensity patterns
     * 1 = light, 2 = medium, 3 = heavy, 4 = success, 5 = warning
     */
    @JavascriptInterface
    public void triggerHaptic(int type) {
        try {
            Vibrator vibrator = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                switch (type) {
                    case 1: // light tick
                        vibrator.vibrate(VibrationEffect.createOneShot(18, VibrationEffect.DEFAULT_AMPLITUDE));
                        break;
                    case 2: // medium tap
                        vibrator.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE));
                        break;
                    case 3: // heavy tap
                        vibrator.vibrate(VibrationEffect.createOneShot(65, 200));
                        break;
                    case 4: // success pattern
                        vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 20, 50, 35}, -1));
                        break;
                    case 5: // warning / error
                        vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 45, 60, 45}, -1));
                        break;
                    default:
                        vibrator.vibrate(VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } else {
                vibrator.vibrate(type == 3 ? 60 : 25);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Updates Home Screen Widget data from React state (Shopping list, remaining count, budget)
     */
    @JavascriptInterface
    public boolean updateWidgetData(String jsonString) {
        try {
            JSONObject obj = new JSONObject(jsonString);
            SharedPreferences prefs = activity.getSharedPreferences(
                NotebookWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            SharedPreferences.Editor editor = prefs.edit();

            if (obj.has("badge")) editor.putString(NotebookWidgetProvider.KEY_BADGE, obj.getString("badge"));
            if (obj.has("summary")) editor.putString(NotebookWidgetProvider.KEY_SUMMARY, obj.getString("summary"));

            JSONArray items = obj.optJSONArray("items");
            if (items != null) {
                editor.putString(NotebookWidgetProvider.KEY_ITEM1, items.length() > 0 ? "• " + items.getString(0) : "");
                editor.putString(NotebookWidgetProvider.KEY_ITEM2, items.length() > 1 ? "• " + items.getString(1) : "");
                editor.putString(NotebookWidgetProvider.KEY_ITEM3, items.length() > 2 ? "• " + items.getString(2) : "");
            } else {
                editor.putString(NotebookWidgetProvider.KEY_ITEM1, "");
                editor.putString(NotebookWidgetProvider.KEY_ITEM2, "");
                editor.putString(NotebookWidgetProvider.KEY_ITEM3, "");
            }

            if (obj.has("remaining")) {
                editor.putString(NotebookWidgetProvider.KEY_REMAINING, obj.getString("remaining"));
            } else {
                editor.putString(NotebookWidgetProvider.KEY_REMAINING, "");
            }

            editor.apply();

            // Refresh all widgets on the home screen
            activity.runOnUiThread(() -> NotebookWidgetProvider.updateAllWidgets(activity));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Schedules exact alarm for reminders that fires even if app is closed or in background
     */
    @JavascriptInterface
    public boolean scheduleReminder(String id, String title, String body, long triggerAtMillis, String category) {
        try {
            AlarmManager alarmManager = (AlarmManager) activity.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return false;

            Intent intent = new Intent(activity, ReminderReceiver.class);
            intent.putExtra(ReminderReceiver.EXTRA_ID, id);
            intent.putExtra(ReminderReceiver.EXTRA_TITLE, title);
            intent.putExtra(ReminderReceiver.EXTRA_BODY, body);
            intent.putExtra(ReminderReceiver.EXTRA_CATEGORY, category);

            int requestCode = id != null ? Math.abs(id.hashCode()) : 100;
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                activity,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public boolean cancelReminder(String id) {
        try {
            AlarmManager alarmManager = (AlarmManager) activity.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null || id == null) return false;

            Intent intent = new Intent(activity, ReminderReceiver.class);
            int requestCode = Math.abs(id.hashCode());
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                activity,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void shareText(String title, String text) {
        try {
            activity.runOnUiThread(() -> {
                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                sendIntent.setType("text/plain");
                Intent shareIntent = Intent.createChooser(sendIntent, title);
                activity.startActivity(shareIntent);
            });
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public boolean isNotificationsEnabled() {
        return NotificationManagerCompat.from(activity).areNotificationsEnabled();
    }
}
