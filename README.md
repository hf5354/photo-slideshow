# Media Slideshow（kiosk 自動播放）

開頁即自動循環播放相片／影片，適合 **Android 廣告機 / kiosk**。

## 網址

https://hf5354.github.io/photo-slideshow/

- 一般模式：有媒體就**自動全螢幕播放**
- 設定模式：https://hf5354.github.io/photo-slideshow/?admin=1  
  或播放中點右下角 ⚙️ / 按 `S`

## 兩種放媒體方式

### A. 本機上傳（存於該裝置瀏覽器）

1. 開啟 `?admin=1`
2. 上傳相片／影片／音樂
3. 資料存在 **IndexedDB**，重新整理、重開瀏覽器仍會自動播  
   （清除瀏覽器資料會消失）

### B. 遠端 playlist（所有裝置共用，推薦廣告機）

1. 把檔案放到 repo 的 `media/` 目錄  
2. 編輯根目錄 `playlist.json`：

```json
{
  "items": [
    { "src": "media/ad1.jpg", "type": "image", "duration": 8, "name": "廣告1" },
    { "src": "media/clip.mp4", "type": "video", "duration": 0, "name": "影片" }
  ]
}
```

- `duration`：相片秒數；影片 `0` = 播完整支  
- push 到 GitHub 並等 Pages 更新後，所有 kiosk 開頁即播

## Android kiosk 開機自動播放（推薦）

### 方案 1：Fully Kiosk Browser（最簡單）

1. 在 Google Play 安裝 **Fully Kiosk Browser**
2. 設定：
   - **Start URL** = `https://hf5354.github.io/photo-slideshow/`
   - 開啟 **Kiosk Mode** / **Fullscreen**
   - **Autostart after boot** = 開啟
   - **Screen on** / 關閉螢幕逾時
3. 裝置開機後會自動開瀏覽器並進入自動播放

詳見 [android-kiosk.md](android-kiosk.md)

### 方案 2：Android 企業 / MDM

使用 MDM 將瀏覽器鎖定為單一 App，開機意圖指向上述 URL。

### 方案 3：ADB / Tasker

```text
am start -a android.intent.action.VIEW -d "https://hf5354.github.io/photo-slideshow/"
```

## 操作快捷鍵（播放中）

| 按鍵 | 功能 |
|------|------|
| ← → | 上一張／下一張 |
| 空白鍵 | 暫停／繼續 |
| F | 全螢幕 |
| M | 背景音樂靜音 |
| S | 開啟設定 |
| Esc | 離開全螢幕或回設定 |

## 啟用 GitHub Pages

Settings → Pages → Deploy from branch → `main` / root
