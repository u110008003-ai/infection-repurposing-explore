# 台灣男性與日韓男性穿搭比較貼文蒐集

這個資料夾放研究腳本輸出的統計結果。腳本只蒐集公開文字、連結與基本 metadata，不下載圖片、不繞登入、不解反爬驗證。

## 執行

```powershell
npm.cmd run research:mens-fashion -- --source ptt,dcard --limit 10
```

只跑 PTT：

```powershell
npm.cmd run research:mens-fashion -- --source ptt --limit 10
```

Dcard 可能會回 `403 Forbidden`，這代表它擋掉自動請求。遇到這種情況不要硬繞，可以先只跑 PTT，或之後改做「手動貼 Dcard 連結/文字，再讓分類器分析」。

指定關鍵字：

```powershell
npm.cmd run research:mens-fashion -- --keywords "台男 韓男 穿搭,台灣男生 日本男生 穿搭" --limit 10
```

## 輸出

輸出會放在：

```text
research/mens-fashion-comparison/output
```

會包含：

- `records-*.json`
- `records-*.csv`
- `summary-*.md`

## 分類欄位

- `ordinary_vs_celebrity_or_model`：普通人或台男，對上明星、模特、偶像、網紅等。
- `ordinary_vs_ordinary`：普通人對普通人的比較。
- `celebrity_or_model_vs_celebrity_or_model`：明星/模特之間的比較。
- `style_discussion_no_clear_subject`：討論風格，但比較對象不明確。
- `irrelevant_or_unclear`：不相關或無法判定。

這是規則式初分類，正式使用前要人工抽樣複核。
