# 從 Url-Shorten-Worker 搬過來

[English](migrate-from-kv.md) | 繁體中文

如果你之前用的是 [Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker)，這份教學會帶你把舊的短網址搬過來。搬完之後，已經分享出去的連結都會繼續有效。

整個過程大約 15 分鐘。舊的 KV 資料只會被讀取，不會被改動；在第 5 步切換網域之前，舊服務也都照常運作，中途隨時可以停下來。

## 會搬過來什麼

| 舊資料 | 結果 |
|---|---|
| 一般短網址（短碼 → 網址） | 匯入 |
| `短碼-count`（舊版開了 visit_count 才會有） | 變成那條短網址的點擊數 |
| `password` | 略過，新版的密碼改用 `ADMIN_PASSWORD` 設定 |
| 128 個字元的長 key（舊版開了 unique_link 才會有） | 略過，新版用不到 |
| 內容不是網址的資料（圖床、pastebin 模式） | 略過，新版只做短網址 |
| 短碼剛好是保留字（例如 `admin`） | 略過，會列在匯入結果裡 |

匯入可以重複按，已經存在的短碼會略過，不會被蓋掉。

## 步驟

### 1. 部署新版

照 [README](../README.zh-TW.md#部署) 部署好新版，但先**不要**綁你的網域，因為那個網域現在還在舊服務上。

部署完後，用 `https://short-url.你的子網域.workers.dev/admin` 確認可以登入。

### 2. 找到舊 KV 的 ID

1. 打開 [Cloudflare 後台](https://dash.cloudflare.com/)，左邊選 **Workers & Pages**，點**舊的** Worker。
2. 進到 **Bindings**，會看到一個變數名稱是 `LINKS` 的 KV namespace，記下它的名稱。
3. 左邊選 **Storage & Databases** → **Workers KV**，找到同名的 namespace。
4. 複製它的 **ID**，是一串 32 個字元的英數字。

### 3. 把舊 KV 接到新 Worker

打開你自己那份 repo 裡的 `wrangler.jsonc`，找到這段：

```jsonc
  // "kv_namespaces": [
  //   { "binding": "LEGACY_KV", "id": "<your old KV namespace ID>" }
  // ],
```

把三行開頭的 `// ` 拿掉，並把 `<your old KV namespace ID>` 換成剛剛複製的 ID，改完長這樣：

```jsonc
  "kv_namespaces": [
    { "binding": "LEGACY_KV", "id": "0123456789abcdef0123456789abcdef" }
  ],
```

接著重新部署：

- **一鍵部署的人**：直接在 GitHub 網頁上改。打開 repo 裡的 `wrangler.jsonc`，按右上角的鉛筆圖示編輯，改完按 **Commit changes**。Cloudflare 會自動重新部署，等一兩分鐘就好。
- **手動部署的人**：存檔後執行 `npm run deploy`。

不要在 Cloudflare 後台的 Bindings 頁面手動加，下次部署時會被設定檔蓋掉。

### 4. 匯入

1. 重新整理新版的 `/admin`，頁面最下面會多出「從舊版 KV 匯入」。
2. 按「開始匯入」。
3. 看一下結果裡的略過清單，確認都是上面表格裡預期會略過的東西。

匯入的短網址會馬上出現在列表裡。可以用 workers.dev 網址試幾個，例如 `https://short-url.你的子網域.workers.dev/某個舊短碼`，確認會正確轉址。

### 5. 把網域換到新版

1. 在 Cloudflare 後台打開**舊的** Worker → **Settings** → **Domains & Routes**，把你的網域（或 Route）移除。
2. 打開**新的** Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**，加上同一個網域。

幾秒到幾分鐘內就會生效。用你的網域試幾個舊的短網址，確認都能正常轉址。

舊版的後台在 `你的網域/你的密碼`，新版改成 `你的網域/admin`。

### 6. 收尾

先用幾天，確認一切正常後：

1. 把 `wrangler.jsonc` 裡 `kv_namespaces` 那三行加回 `// `（或直接刪掉），重新部署。
2. 在 Cloudflare 後台刪掉舊的 Worker 和舊的 KV namespace。

## 如果出問題

- **沒看到「從舊版 KV 匯入」**：第 3 步的部署可能還沒跑完，或 `wrangler.jsonc` 改錯了。到 Cloudflare 後台新 Worker 的 **Deployments** 看最新一次部署有沒有成功。
- **想退回舊版**：在第 5 步之前，什麼都不用做，舊服務一直在跑。第 5 步之後，把網域從新 Worker 移除、加回舊 Worker 就好。
- **舊資料非常多而匯入失敗**：匯入在一次請求內完成，幾千筆以內都沒問題。如果你的資料量大到失敗，請開 issue。
