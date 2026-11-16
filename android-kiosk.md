# Android Kiosk 廣告機設定指南

目標：裝置**一開機**就全螢幕開啟 slideshow 網頁並自動播放。

建議網址：

```
https://hf5354.github.io/photo-slideshow/
```

## 推薦：Fully Kiosk Browser

1. 安裝 Fully Kiosk Browser（https://www.fully-kiosk.com/）
2. 設定 Start URL 為上面網址
3. 啟用：
   - Kiosk Mode
   - Autostart on boot
   - Keep screen on
   - Disable status bar / soft keys（依授權版本）
4. 可設定定時重新載入頁面（例如每 6 小時）以取得最新 `playlist.json`

## 媒體更新流程

1. 把新圖片／影片放到 GitHub repo 的 `media/`
2. 更新 `playlist.json` 的 `items`
3. Push 到 `main`
4. 等 GitHub Pages 部署完成
5. kiosk 重新整理或定時 reload 後即更新

## 本機測試設定頁

```
https://hf5354.github.io/photo-slideshow/?admin=1
```

## 注意

- 第一次自動全螢幕／自動播音樂，部分瀏覽器需使用者點一下（Fully Kiosk 通常可自動）
- 影片檔請盡量用 **MP4 (H.264)** 以利 Android 相容
- 若用本機 IndexedDB 上傳，每台裝置要各自上傳一次；多台機器請用 `playlist.json`
