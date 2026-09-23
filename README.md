# Photo Slideshow

上傳多張相片，為每張設定播放秒數，然後以全螢幕 slideshow 形式**不斷循環播放**。

## 功能

- 支援一次上傳多張圖片（JPG / PNG / GIF / WebP）
- 拖曳或點擊上傳
- 可為**每張相片**單獨設定播放秒數（1–300 秒）
- 也可一次「套用到全部」
- 全螢幕循環播放，播完自動從頭開始
- 淡入淡出轉場
- 進度條顯示當前張剩餘時間
- 鍵盤操作：← → 切換、空白鍵暫停/繼續、Esc 結束
- 純前端，圖片只存在瀏覽器記憶體，不會上傳到任何伺服器

## 使用方式

1. 開啟 `index.html`（或啟用 GitHub Pages 後用線上網址）
2. 上傳相片
3. 調整每張的秒數（可選）
4. 按「開始播放」

## 啟用 GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source：**Deploy from a branch**
3. Branch：`main`，資料夾：`/ (root)`
4. Save

之後網址：https://hf5354.github.io/photo-slideshow

## 技術

純 HTML + CSS + JavaScript，無依賴、無建置步驟。
