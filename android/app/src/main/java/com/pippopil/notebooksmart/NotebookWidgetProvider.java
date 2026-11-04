package com.pippopil.notebooksmart;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class NotebookWidgetProvider extends AppWidgetProvider {
    public static final String PREFS_NAME = "NotebookSmartWidgetPrefs";
    public static final String KEY_TITLE = "widget_title";
    public static final String KEY_BADGE = "widget_badge";
    public static final String KEY_SUMMARY = "widget_summary";
    public static final String KEY_ITEM1 = "widget_item_1";
    public static final String KEY_ITEM2 = "widget_item_2";
    public static final String KEY_ITEM3 = "widget_item_3";
    public static final String KEY_REMAINING = "widget_remaining";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String badge = prefs.getString(KEY_BADGE, "🛒 Покупки");
        String summary = prefs.getString(KEY_SUMMARY, "Нажмите, чтобы открыть тетрадь");
        String item1 = prefs.getString(KEY_ITEM1, "• Молоко 3.2%");
        String item2 = prefs.getString(KEY_ITEM2, "• Хлеб бородинский");
        String item3 = prefs.getString(KEY_ITEM3, "• Сыр твёрдый");
        String remaining = prefs.getString(KEY_REMAINING, "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_notebook);
        views.setTextViewText(R.id.widget_badge, badge);
        views.setTextViewText(R.id.widget_summary, summary);
        views.setTextViewText(R.id.widget_item_1, item1);
        views.setTextViewText(R.id.widget_item_2, item2);
        views.setTextViewText(R.id.widget_item_3, item3);
        views.setTextViewText(R.id.widget_remaining, remaining);

        // PendingIntent to launch MainActivity on tap
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, NotebookWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(widget);
        if (ids != null && ids.length > 0) {
            for (int id : ids) {
                updateAppWidget(context, manager, id);
            }
        }
    }
}
