# POS Assistant 機能概要

POS Assistant は東進学力POSの操作体験を改善する Chrome 拡張です。本ドキュメントでは、主要機能と対応ページをまとめます。

## セッション管理
- 対象ページ: `https://www.toshin.com/pos`, `https://pos.toshin.com/sso1/ssomenu/sessionerror.html*`, `https://pos2.toshin.com/RBT2/RBT_Student/Page/ErrorPages/RBTLoginError.aspx`
- 内容:
  - サイトトップから `https://pos.toshin.com/SSO1/SSOMenu/StudentMenu.aspx` への自動遷移 (認証済みの場合)
  - セッションエラー画面検知時のリダイレクト処理 (ログインページへ)
  - サービスワーカー経由で StudentMenu.aspx へのアクセス可否を確認し、認証状態を判定

## POS アプリケーション表示調整
- 対象ページ: `https://pos.toshin.com/SSO1/SSOMenu/PosApplication.aspx`
- 内容:
  - 外側ページを 100vh 固定・スクロール無効化
  - `iframe#appFrame` の高さをウィンドウサイズに追随させ、内部スクロールのみ許可
  - ズームやリサイズ時の iframe 高さ再計算
  - `appFrame` が `SSOLogin/StudentLogin.aspx` を表示した場合は `StudentMenu.aspx` へ強制遷移

## 演習アシスタント
- 対象ページ:
  - `https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/EnshuKaishi*`
  - `https://pos.toshin.com/TGT/OPCTSS/OPCTSS_Student/EnshuKaishi*`
  - `https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu*`
  - `https://pos.toshin.com/TGT/OPCTSS/OPCTSS_Student/MondaiKaitoInsatsu*`
- 内容:
  - 演習開始画面での操作補助
  - 印刷画面における快適なレイアウト調整 (詳細は `functions/enshu_assistant` 配下参照)

## 実装メモ
- 新機能を追加する場合は `functions/` 以下にモジュールを作成し、`content.js` / `background.js` から動的 import で呼び出してください。
- モジュールを公開する場合は `manifest.json` の `web_accessible_resources` に追加してください。
- 新しい対象ページを処理する場合は `manifest.json` の `content_scripts.matches` に URL パターンを加えてください。
