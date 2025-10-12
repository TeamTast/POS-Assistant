# POS Assistant

東進学力POSの機能を改善するChrome拡張。

## How to add function
1. `functions/` 配下に新しいモジュール群を追加します。
2. 既存の `content.js` または `background.js` から `chrome.runtime.getURL()` を使って import し、初期化関数を呼び出します。
3. 新しいファイルを動的 import する場合は `manifest.json` の `web_accessible_resources` にリソースを追加してください。
4. 対象ページでコンテンツスクリプトを走らせる必要があるときは、`manifest.json` の `content_scripts.matches` に URL パターンを追加します。