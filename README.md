# Photo Slideshow

上傳多張相片與背景音樂，為每張設定播放秒數，然後以全螢幕 slideshow 形式**不斷循環播放**。

## 功能

- 支援一次上傳多張圖片（JPG / PNG / GIF / WebP）
- 拖曳或點擊上傳
- 可為**每張相片**單獨設定播放秒數（1–300 秒）
- 也可一次「套用到全部」
- **背景音樂**：上傳 MP3 / WAV / OGG 等，可調音量、靜音
- **全螢幕播放**按鈕（瀏覽器 Fullscreen API）
- 循環播放，播完自動從頭開始
- 淡入淡出轉場
- 進度條顯示當前張剩餘時間
- 鍵盤操作：
  - `←` `→` 切換相片
  - `空白鍵` 暫停 / 繼續
  - `F` 全螢幕
  - `M` 靜音 / 取消靜音
  - `Esc` 退出全螢幕或結束播放
- 純前端，圖片與音樂只存在瀏覽器記憶體，不會上傳到任何伺服器

## 使用方式

1. 開啟 `index.html`（或啟用 GitHub Pages 後用線上網址）
2. 上傳相片
3. （可選）選擇背景音樂並調整音量
4. 調整每張的秒數（可選）
5. 按「開始播放」
6. 播放中可按「全螢幕」或按 `F`

## 啟用 GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source：**Deploy from a branch**
3. Branch：`main`，資料夾：`/ (root)`
4. Save

之後網址：https://hf5354.github.io/photo-slideshow

## 技術

純 HTML + CSS + JavaScript，無依賴、無建置步驟。
