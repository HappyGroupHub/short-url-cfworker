# short-url-cfworker

[English](README.en.md) | 繁體中文

架在 Cloudflare Workers 上的個人短網址服務，資料存在 D1，附一個好用的管理後台。全部跑在 Cloudflare 免費方案內，不需要自己的伺服器。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/HappyGroupHub/short-url-cfworker)

## 功能

- `你的網域/短碼` 直接 302 轉址，網址後面的查詢參數會一起帶過去
- 後台 `/admin`：建立、搜尋、編輯、刪除短網址，可以加備註
- 輸入網址時自動產生短碼，也可以改成自訂的（支援中文），之後也能再改
- 點擊次數統計
- 密碼登入，密碼存在 Cloudflare 的加密 Secret 裡；同一個 IP 15 分鐘內最多只能試 5 次
- 介面支援繁體中文 / English、亮色 / 暗色模式，手機也能用
- 可以從舊版 [Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker)（KV 版本）一鍵匯入舊資料

## 一鍵部署（推薦）

1. 點上面的 **Deploy to Cloudflare** 按鈕，登入你的 Cloudflare 帳號。
2. 依照畫面連結你的 GitHub 帳號。Cloudflare 會把這個 repo 複製一份到你的 GitHub，並自動建立 D1 資料庫。
3. 在 `ADMIN_PASSWORD` 欄位填入後台密碼（請用夠長的隨機字串）。
4. 按下部署，等它跑完。
5. 打開 `https://<worker 名稱>.<你的帳號>.workers.dev/admin`，用剛剛的密碼登入。

之後你改了自己那份 repo 的程式碼並 push，Cloudflare 會自動重新部署。

## 手動部署

需要 [Node.js](https://nodejs.org/) 20 以上。

```bash
git clone https://github.com/HappyGroupHub/short-url-cfworker.git
cd short-url-cfworker
npm install
npx wrangler login
npm run deploy
```

第一次部署時 Wrangler 會問你要不要建立新的 D1 資料庫，選建立即可。資料表會在第一次有人連進來時自動建立，不需要另外跑 migration。

接著設定後台密碼：

```bash
npx wrangler secret put ADMIN_PASSWORD
```

## 綁定自己的網域

Cloudflare 後台 → **Workers & Pages** → 選你的 Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**，輸入例如 `s.example.com`。網域必須已經託管在 Cloudflare 上。

## 設定

| 名稱 | 類型 | 說明 |
|---|---|---|
| `ADMIN_PASSWORD` | Secret（必填） | 後台登入密碼。沒設定的話後台會拒絕所有登入。改密碼會讓所有已登入的裝置登出。 |
| `HOME_URL` | 變數（選填） | 有人直接打開網域首頁時要轉去哪裡，例如你的官網。留空則顯示一個簡單頁面。在 `wrangler.jsonc` 的 `vars` 裡修改。 |
| `LEGACY_KV` | KV 綁定（選填） | 只有從舊版搬家時才需要，見下面。 |

## 從舊版 Url-Shorten-Worker 搬家

如果你原本用的是 crazypeace/Url-Shorten-Worker（資料存在 KV），可以把舊的短網址整批匯入，搬完後原本發出去的連結都會繼續有效。詳細步驟請看 [docs/migrate-from-kv.md](docs/migrate-from-kv.md)。

## 本機開發

```bash
cp .dev.vars.example .dev.vars   # 然後在檔案裡填 ADMIN_PASSWORD
npm run dev                      # http://localhost:8787/admin/
npm test                         # 單元測試
npm run typecheck                # 型別檢查
```

## 免費額度夠用嗎？

個人使用通常完全夠。Workers 免費方案每天 10 萬次請求；D1 每天 500 萬列讀取、10 萬列寫入。

- 每次點擊短網址：讀 1 列 + 寫 1 列（更新點擊數）
- 後台搜尋一次：大約讀取「全部短網址數量」那麼多列

換算下來，真正的上限是 Workers 每天 10 萬次請求，也就是一天接近 10 萬次點擊。額度每天台灣時間早上 8 點重置。

## 其他說明

- **為什麼用 302 而不是 301？** 301 會被瀏覽器永久快取，之後改目標網址或統計點擊都會失準。
- **保留字**：`admin`、`api`、`favicon.svg`、`robots.txt` 不能當短碼。
- **短碼規則**：文字（含中文）、數字和 `- _ . ~`，不能以 `.` 開頭，最多 64 字。自動產生的短碼會避開 `0 O 1 l I` 這類容易看錯的字。
- **點擊統計**：`HEAD` 請求（通常是聊天軟體產生連結預覽）不計入。
- **改短碼**：改了之後舊的短網址會直接失效，已經分享出去的連結會打不開。
- **換 icon**：替換 `public/favicon.svg` 就好。

## 專案結構

```
src/
  index.ts       轉址與路由
  api.ts         後台 API（/api/*）
  auth.ts        密碼與登入 session
  db.ts          D1 資料表與查詢
  links.ts       短碼、網址驗證
  rate-limit.ts  登入次數限制
  import-kv.ts   舊版 KV 匯入
  pages.ts       首頁與 404 頁面
public/
  admin/         後台頁面（HTML / CSS / JS，沒有建置步驟）
test/            單元測試（Vitest）
```

## License

[MIT](LICENSE)
