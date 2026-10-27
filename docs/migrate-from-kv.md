# 從舊版 Url-Shorten-Worker（KV）搬家

[English](migrate-from-kv.en.md) | 繁體中文

這份指南適用於原本使用 [crazypeace/Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker)，資料存在 Workers KV 的人。整個過程不會改動舊的 KV 資料，切換網域前舊服務也照常運作，隨時可以退回。

## 會匯入什麼

| 舊 KV 裡的資料 | 處理方式 |
|---|---|
| 一般短網址（短碼 → 網址） | 匯入 |
| `短碼-count`（visit_count 開啟時的點擊數） | 併入該短網址的點擊數 |
| `password` | 略過，新版改用 `ADMIN_PASSWORD` |
| 128 字元的 SHA-512 key（unique_link 開啟時產生） | 略過，新版不需要 |
| 值不是網址的資料（imghost 圖床、pastebin 等模式） | 略過，新版只做短網址 |
| 短碼和新版保留字衝突（例如 `admin`） | 略過，會列在匯入結果裡 |

匯入可以重複執行，已存在的短碼會自動略過，不會覆蓋。

## 步驟

### 1. 部署新版

照 [README](../README.md) 用一鍵部署或手動部署，先**不要**綁自訂網域。部署好後用 `https://short-url.<你的帳號>.workers.dev/admin` 確認可以登入。

### 2. 找到舊的 KV namespace ID

Cloudflare 後台 → **Workers & Pages** → 選舊的 Worker → **Settings** → **Bindings**，找到名為 `LINKS` 的 KV namespace，記下它的名稱。

再到 **Storage & Databases** → **Workers KV**，找到同名的 namespace，複製它的 **ID**。

### 3. 把舊 KV 綁到新 Worker

打開你那份 repo 裡的 `wrangler.jsonc`，把這段的註解拿掉並填入 ID：

```jsonc
"kv_namespaces": [
  { "binding": "LEGACY_KV", "id": "<舊的 KV namespace ID>" }
],
```

- 一鍵部署的人：直接在 GitHub 上編輯這個檔案並 commit，Cloudflare 會自動重新部署。
- 手動部署的人：存檔後執行 `npm run deploy`。

> 不要在 Cloudflare 後台手動加綁定，下次部署時會被設定檔覆蓋掉。

### 4. 匯入

重新整理 `/admin`，下面會多出「從舊版 KV 匯入」區塊，按下「開始匯入」，確認結果裡略過的項目都是預期中的。

### 5. 切換網域

1. 舊 Worker → **Settings** → **Domains & Routes**，移除你的自訂網域（或 Route）。
2. 新 Worker → **Settings** → **Domains & Routes** → **Add**，加上同一個網域。

切換幾秒內就會生效。拿幾個舊的短網址測試一下是否都能正常轉址。

> 舊版的後台網址是 `你的網域/你的密碼`，換成新版後改成 `你的網域/admin`。

### 6. 收尾

確認沒問題，過幾天後就可以：

- 把 `wrangler.jsonc` 裡的 `kv_namespaces` 那段刪掉或註解回去，重新部署。
- 刪除舊 Worker 和舊 KV namespace。

## 限制

匯入在一次請求內完成，舊 KV 大約幾千筆以內都沒問題。如果你的資料量非常大而匯入失敗，請開 issue。
