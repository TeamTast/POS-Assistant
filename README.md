# POS Assistant

学力POSの機能を改善するChrome拡張

## 機能

- **セッション管理** 
  - セッションが存在する場合に `https://pos.toshin.com/SSO1/SSOMenu/StudentMenu.aspx` へ自動リダイレクト
  - 「セッションが破棄されました」ページからログインページへの自動リダイレクト
- **フロントの改善**
  - `PosApplication.aspx` を 100vh 固定・スクロール無効化
  - `iframe#appFrame` の高さ制御を再コントロール
  - `iframe#appFrame` が `SSOLogin/StudentLogin.aspx` を表示した場合は `StudentMenu.aspx` へリダイレクト
- **過去問演習の改善**
  - マークシートの数字入力時、Backspaceで取り消しを可能に
  - `GetMondaiPdf.pdf` および `GetKaisetsuPdf.pdf` から教材の名称へ変更

## 機能の追加
1. `functions/` 配下に新しいモジュールを作成
2. 既存の `content.js` または `background.js` から `chrome.runtime.getURL()` を使って import し、初期化関数を呼び出す
3.  `manifest.json` の `web_accessible_resources` にjsファイルを追加
4. 特定ページでの操作が必要な時は `manifest.json` の `content_scripts.matches` に URLを追加