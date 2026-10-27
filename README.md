# short-url-cfworker

[English](README.en.md) | 繁體中文

一個架在 Cloudflare Workers 上的個人短網址服務。短網址存在 Cloudflare D1 資料庫裡，用網頁後台管理，全部在 Cloudflare 免費方案內就能跑，不需要自己的伺服器。

<img src="docs/images/admin.png" alt="管理後台" width="720">

## 功能

- `你的網域/短碼` 會 302 轉址到目標網址，網址後面的查詢參數（例如 `?utm_source=...`）也會一起帶過去
- 在 `/admin` 後台建立、搜尋、編輯、刪除短網址，每條都可以加備註
- 輸入目標網址時會自動產生一組短碼，可以直接用，也可以改成自己想要的（中文也行），之後還能再改
- 記錄每條短網址的點擊次數
- 用密碼登入，同一個 IP 在 15 分鐘內最多只能試 5 次密碼；登入後只要不登出，這個瀏覽器就會一直保持登入
- 介面預設是英文，右上角可以切換成繁體中文（會記住你的選擇）；支援亮色和暗色模式，手機也能用

## 部署

部署有兩種方式，選一種就好：

- [一鍵部署](#一鍵部署推薦)：全部在網頁上完成，不用裝任何東西，適合大部分人。
- [手動部署](#手動部署)：用指令部署，適合想在自己電腦上改程式的人。

開始前你需要一個 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)（免費）和一個 GitHub 帳號。

### 一鍵部署（推薦）

按下按鈕後，Cloudflare 會幫你做完這些事：

- 把這個專案複製一份到你的 GitHub，變成你自己的 repo（不是 fork，你不用先 fork）
- 建立 D1 資料庫並接到 Worker 上
- 建置並部署 Worker
- 之後你只要 push 到那個 repo，Cloudflare 就會自動重新部署

你要做的只有下面這幾步。

**1. 按下部署按鈕**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/HappyGroupHub/short-url-cfworker)

如果還沒登入 Cloudflare，會先要你登入。

**2. 連結 GitHub**

畫面會請你連結 Git 帳號，選 GitHub，照指示授權 Cloudflare。已經連結過的話會直接跳過這步。

**3. 確認設定**

設定頁面上的欄位大多已經填好了：

| 欄位 | 要做什麼 |
|---|---|
| Git 帳號和 repository 名稱 | 選要把 repo 建在哪個帳號底下，名稱可以照預設 |
| Worker 名稱（Project name） | 預設是 `short-url`，會出現在網址裡，想改可以改 |
| D1 資料庫 | 照預設，Cloudflare 會幫你建一個新的 |
| `ADMIN_PASSWORD` | 後台密碼，請自己填一組夠長的隨機字串 |
| Build / Deploy 指令 | 照預設，不用動 |

**4. 部署**

按下 **Create and deploy**，等建置跑完，大約一兩分鐘。

**5. 登入後台**

部署完成後畫面會顯示 Worker 的網址，長得像 `https://short-url.你的子網域.workers.dev`。在後面加上 `/admin` 打開，用剛剛設定的密碼登入，就可以開始建立短網址了。

接下來如果想用自己的網域，請看[綁定自己的網域](#綁定自己的網域)。

### 手動部署

需要 [Node.js](https://nodejs.org/) 20 以上和 Git。

**1. 下載專案並安裝套件**

```bash
git clone https://github.com/HappyGroupHub/short-url-cfworker.git
cd short-url-cfworker
npm install
```

**2. 登入 Cloudflare**

```bash
npx wrangler login
```

瀏覽器會打開 Cloudflare 的授權頁面，按允許。

**3. 部署**

```bash
npm run deploy
```

第一次部署時，Wrangler 會問你要不要建立新的 D1 資料庫，選建立。資料表會在第一次有人連進來時自動建立，不需要另外跑任何資料庫指令。

**4. 設定後台密碼**

```bash
npx wrangler secret put ADMIN_PASSWORD
```

輸入你要的密碼後按 Enter。

**5. 登入後台**

打開部署時顯示的網址，後面加上 `/admin`，用剛剛的密碼登入。

## 綁定自己的網域

網域要先託管在 Cloudflare 上（DNS 由 Cloudflare 管理）。

1. 打開 [Cloudflare 後台](https://dash.cloudflare.com/)，左邊選 **Workers & Pages**，點你的 Worker。
2. 進到 **Settings**，找到 **Domains & Routes**，按 **Add**。
3. 選 **Custom domain**，輸入要用的網域，例如 `s.example.com`，按 **Add domain**。

等幾分鐘憑證發好就能用了。之後建議都從自己的網域打開後台，複製出去的短網址也會是這個網域。

## 設定

| 名稱 | 說明 | 怎麼改 |
|---|---|---|
| `ADMIN_PASSWORD` | 後台密碼（必填）。改密碼會讓所有已登入的裝置登出。 | Cloudflare 後台 → 你的 Worker → **Settings** → **Variables and Secrets**，編輯 `ADMIN_PASSWORD` |
| `HOME_URL` | 有人直接打開網域首頁時要轉去哪裡，例如你的官網。留空會顯示一個簡單的頁面。 | 改你那份 repo 裡 `wrangler.jsonc` 的 `vars.HOME_URL`，然後 push |

`HOME_URL` 請改在 `wrangler.jsonc` 裡，不要在 Cloudflare 後台改，因為每次部署都會用設定檔的值蓋掉後台的設定。

## 更新到新版

一鍵部署建立的是複製出來的 repo，不會自動跟著這個專案更新。想更新的話，在你自己那份 repo 的資料夾裡執行：

```bash
git remote add upstream https://github.com/HappyGroupHub/short-url-cfworker.git
git pull upstream main
git push
```

第一行只有第一次需要。push 之後 Cloudflare 會自動重新部署。如果 `wrangler.jsonc` 有衝突，保留你自己的設定就好。

## 免費額度夠用嗎？

個人使用通常完全夠。Workers 免費方案每天可以處理 10 萬次請求，D1 每天可以讀 500 萬列、寫 10 萬列。

每次有人點短網址會讀 1 列、寫 1 列（更新點擊數），後台搜尋一次大約讀取跟短網址總數一樣多的列。算下來真正的上限是 Workers 的每天 10 萬次請求，也就是一天接近 10 萬次點擊。額度在台灣時間每天早上 8 點重置。

## 其他說明

- 轉址用 302 而不是 301，因為瀏覽器會永久快取 301，之後改目標網址或統計點擊都會不準。
- `admin`、`api`、`favicon.svg`、`robots.txt` 是保留字，不能當短碼。
- 短碼可以用文字（含中文）、數字和 `- _ . ~`，不能以 `.` 開頭，最多 64 個字。自動產生的短碼會避開 `0 O 1 l I` 這類容易看錯的字。
- 改了短碼之後舊的短網址會直接失效，已經分享出去的連結會打不開。
- `HEAD` 請求不算點擊，這種請求通常是聊天軟體在產生連結預覽。
- 想換 icon 的話，替換 `public/favicon.svg` 就好。

## 從 Url-Shorten-Worker 搬過來

如果你原本用的是 [Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker)（資料存在 KV），可以把舊的短網址整批匯入，已經分享出去的連結都會繼續有效。步驟請看 [docs/migrate-from-kv.md](docs/migrate-from-kv.md)。

## 本機開發

```bash
cp .dev.vars.example .dev.vars   # 然後在檔案裡填 ADMIN_PASSWORD
npm run dev                      # http://localhost:8787/admin/
npm test                         # 單元測試
npm run typecheck                # 型別檢查
```

## 專案結構

```
src/
  index.ts       轉址與路由
  api.ts         後台 API（/api/*）
  auth.ts        密碼與登入 session
  rate-limit.ts  登入次數限制
  db.ts          D1 資料表與查詢
  links.ts       短碼、網址驗證
  import-kv.ts   從 KV 匯入
  pages.ts       首頁與 404 頁面
public/
  admin/         後台頁面（HTML / CSS / JS，沒有建置步驟）
test/            單元測試（Vitest）
```

## License

[MIT](LICENSE)
