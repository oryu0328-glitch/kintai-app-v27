勤怠管理表 v28.0.0（v27からの軽微修正）

【変更】
・下部タスクバーの並びを ホーム→スタッフ→カレンダー→給与計算→その他 に変更。
・月間カレンダーの日付マスを同じ高さに固定。給料日がある週だけ高くなる問題を修正。
・既存の打刻・給与計算・スタッフ・テーマ5色・タスク・アイコンは維持。
・保存データの互換性を守るため、localStorageのキーはv27から変更していません。

【GitHub更新】
1. 念のためアプリからJSONバックアップを取得。
2. ZIPを解凍し、フォルダの中身（index.html、各種CSS/JS、アイコンなど）を確認。
3. GitHubの kintai-app-v27 リポジトリで、Code→Add file→Upload files を開く。
4. v28の全ファイルをアップロード。旧版 style.v27.css / app.v27.js / ui.v27.js はGitHubで削除（残してもindex.htmlからは読み込まれません）。
5. Commit changes で main ブランチに保存。GitHub Pages の公開を待つ。
6. 公開URLを再読み込みし、下部タブとカレンダーを確認。

コミットメッセージ：Fix bottom navigation order and calendar row heights (v28.0.0)
詳細：Swap Staff/Calendar tabs; normalize payday calendar rows; keep v27 data compatibility.

注意：アプリはブラウザのlocalStorageに保存します。端末・URL・ブラウザを変更した場合はJSONから復元してください。
