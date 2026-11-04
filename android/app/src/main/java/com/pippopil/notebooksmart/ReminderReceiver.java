package com.pippopil.notebooksmart;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class ReminderReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "notebook_reminders_channel";
    public static final String EXTRA_ID = "reminder_id";
    public static final String EXTRA_TITLE = "reminder_title";
    public static final String EXTRA_BODY = "reminder_body";
    public static final String EXTRA_CATEGORY = "reminder_category";

    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra(EXTRA_ID);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        String category = intent.getStringExtra(EXTRA_CATEGORY);

        if (title == null || title.isEmpty()) {
            title = "Напоминание в тетради 📓";
        }

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager == null) return;

        // Create notification channel for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Напоминания NotebookSmart";
            String description = "Точные уведомления о покупках, событиях и бюджете";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            notificationManager.createNotificationChannel(channel);
        }

        // Tap opens MainActivity
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (id != null) {
            launchIntent.putExtra("note_id", id);
        }

        int requestCode = id != null ? Math.abs(id.hashCode()) : 100;
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body != null && !body.isEmpty() ? body : "Пора заглянуть в тетрадь")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setVibrate(new long[]{0, 250, 150, 250})
            .setContentIntent(pendingIntent);

        if ("shopping".equalsIgnoreCase(category)) {
            builder.setSubText("🛒 Список покупок");
        } else if ("event".equalsIgnoreCase(category)) {
            builder.setSubText("📅 Событие");
        } else {
            builder.setSubText("📓 Заметка");
        }

        notificationManager.notify(requestCode, builder.build());
    }
}
