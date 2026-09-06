# SHAFU

社不ちゃん専用の動画制作・ストーリー管理画面。`/control` で提供する。

## 制作フロー

`IDEAS → FAVORITES → IDEA → DEVELOP → SCENARIO → PREFLIGHT → PROMPT → ARCHIVE`

- AIは候補生成、矛盾・重複・生成リスクの整理、選択済み案の映像化を担当する。
- 採用・不採用と警告を無視して進める判断はユーザーが行う。
- BIBLEは固定設定、STORYとTIMELINEは時間とともに変わる状態を管理する。
- MAIN / SIDE / LINKは作品とTIMELINEの両方で保持する。

## 保存

- 未ログイン時は `localStorage` の `shafu_workspace_v1` に端末保存する。
- ログイン時は既存のWS studio認証を再利用し、`public.shafu_workspaces` にユーザー単位のワークスペースを同期する。
- 参照画像と完成動画は非公開の `shafu-media` Storage bucketへ保存し、メタデータを `public.shafu_assets` に置く。
- テーブルとStorageの双方でRLSを有効にし、`auth.uid()` と先頭フォルダが一致するファイルだけ操作できる。
- 初回ログイン時、旧Controlの `ws_control_v3_state` とIndexedDB `ws_control_assets_v1/images` を可能な範囲で自動移行する。

ワークスペース内ではIdeas、Projects、Episodes、Story、Milestones、Timeline、Bible versions、NotesをID参照で関連付ける。FAVORITESとARCHIVEは内容を複製する別レコードではなく、それぞれIdeaとProjectの状態から導出する。

## AI

ブラウザで入力したOpenAI APIキーを `/api/control/ai` にリクエスト単位で渡す。キーはDBへ保存しない。生成操作はJSON Schemaで構造化し、以下を共通ルールとしている。

- 説明台詞、ナレーション、教訓、AI的な決め台詞を避ける。
- 映像、間、視線、動線、小物で伝える。
- BIBLEにない正史を勝手に確定しない。
- 面白さの点数や自動採否を返さない。

PROMPTはMiniMax H3とSeedanceをモデル別に整形する。H3は公式の4〜15秒／最大7000文字に合わせ、30〜60秒作品を15秒以下の連続CLIPに分割する。Seedanceは30秒以下のCLIPを基本に、参照番号、連続性、動作とカメラの分離を維持する。

- MiniMax: https://platform.minimax.io/docs/guides/video-generation
- Seedance: https://docs.byteplus.com/en/docs/ModelArk/2222480

## 確認

```bash
npm run test:shafu
npm run build
```
