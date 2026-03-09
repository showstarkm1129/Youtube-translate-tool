# バイブコーディング用プロンプト集

このファイルには、各ステップでAntigravityのエージェントに渡すプロンプトをまとめています。
各プロンプトは上から順番に使ってください。前のステップが完了してから次に進みます。

---

## 前提: CLAUDE.md（プロジェクトルールファイル）の設置

Antigravityで新規プロジェクトを作成したら、まず `PROJECT.md` の内容をプロジェクトのナレッジベース（スキル/ルール機能）に登録してください。これによりエージェントがプロジェクト全体の背景を把握した状態でタスクを実行できます。

---

## ステップ1: プロジェクトセットアップ + 動画再生

### プロンプト

```
Next.jsプロジェクトを新規作成し、YouTube動画を再生できる画面を実装してください。

要件:
- Next.js (App Router) + TypeScript でセットアップ
- YouTube IFrame Player API を使って動画を埋め込み再生する VideoPlayer コンポーネントを作成
- URL入力欄に YouTube の動画URLを入力すると、その動画が再生される
- player.getCurrentTime() で現在の再生位置（秒）をリアルタイムに取得し、画面に表示する（デバッグ用）
- YouTube IFrame API の型定義は @types/youtube パッケージを使うか、必要に応じて自前で宣言する
- スタイリングは Tailwind CSS を使用

ディレクトリ構成:
- src/app/page.tsx: メインページ（URL入力 + プレーヤー表示）
- src/components/VideoPlayer.tsx: YouTube IFrame Player ラッパー
- src/components/UrlInput.tsx: URL入力コンポーネント
- src/hooks/useYouTubePlayer.ts: プレーヤー制御用カスタムHook
- src/lib/types.ts: 型定義

動作確認: URL入力 → 動画が表示・再生される → 再生位置がリアルタイムで画面に表示される
```

### 完了条件
- `npm run dev` でローカルサーバーが起動する
- YouTube URLを入力すると動画が再生される
- 再生位置（秒数）がリアルタイムに画面に表示される

---

## ステップ2: 字幕データの取得

### プロンプト

```
YouTube Data API v3 を使って、動画の字幕データ（原語テキスト + タイムスタンプ）を取得する機能を追加してください。

要件:
- .env.local に YOUTUBE_API_KEY を設定する前提
- Next.js API Route（src/app/api/subtitles/route.ts）を作成
  - リクエスト: videoId（文字列）
  - レスポンス: SubtitleEntry[] の配列（startTime, endTime, originalText）
- YouTube Data API v3 の captions.list で字幕トラック一覧を取得し、captions.download で字幕本文を取得する
- もし captions.download でOAuth認証が必要でAPIキーのみでは取得できない場合は、代替手段としてYouTubeの timedtext エンドポイント（https://www.youtube.com/api/timedtext?v={videoId}&lang={lang}）からの取得を試みる
- 字幕フォーマット（XML/SRT/VTT等）をパースしてSubtitleEntry[]に変換するパーサーを src/lib/subtitle-parser.ts に実装
- フロントエンドに「字幕取得」ボタンを追加し、取得した字幕データをstateに保存
- 取得した字幕の一覧をデバッグ用に画面に表示（タイムスタンプ + 原語テキスト）

型定義（src/lib/types.ts に追加）:
interface SubtitleEntry {
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
}

APIキーはサーバーサイド（API Route）でのみ使用し、フロントエンドには露出させないこと。
```

### 完了条件
- 動画URLを入力後、「字幕取得」で原語字幕の一覧が表示される
- タイムスタンプ（開始・終了）と原語テキストが正しく取得できている
- APIキーがフロントエンドに露出していない

### 補足
ここが最もハマりやすいステップです。YouTube Data APIのcaptions.downloadが第三者の動画で使えない場合、エージェントにエラーログを見せて代替手段への切り替えを指示してください。

---

## ステップ3: 翻訳処理（プロバイダー差し替え可能設計）

### プロンプト

```
翻訳プロバイダーを差し替え可能な設計で、字幕の日本語翻訳機能を実装してください。まずGemini実装を作ります。

要件:

【プロバイダーの抽象化】
- src/lib/translation/provider.ts に TranslationProvider インターフェースを定義:
  interface TranslationProvider {
    name: string;
    translate(entries: SubtitleEntry[], context?: string): Promise<SubtitleEntry[]>;
  }
- src/lib/translation/gemini.ts に GeminiProvider クラスを実装
- src/lib/translation/index.ts にプロバイダーの登録・取得ロジックを実装:
  - getProvider(id: ProviderId): TranslationProvider
  - getAvailableProviders(): ProviderId[]（環境変数にAPIキーが設定されているもののみ返す）
- type ProviderId = "gemini" | "claude" | "deepl" を定義

【API Route】
- Next.js API Route（src/app/api/translate/route.ts）を作成
  - リクエスト: { entries: SubtitleEntry[], provider: ProviderId }
  - レスポンス: 翻訳済みの SubtitleEntry[]（translatedText が埋まった状態）
  - リクエストで指定された provider に応じて実装を切り替える

【Gemini実装の詳細】
- .env.local に GEMINI_API_KEY を設定する前提
- 翻訳は以下のチャンク戦略で行う:
  - 字幕を20〜30エントリごとにチャンク分割
  - 各チャンクには前のチャンクの最後の3エントリを「文脈」として含める
  - 翻訳プロンプトには以下を含める:
    「以下はYouTube動画の字幕です。各行を自然な日本語に翻訳してください。
     前後の文脈を考慮し、一貫性のある訳文にしてください。
     タイムスタンプはそのまま保持し、翻訳テキストのみを返してください。
     JSONフォーマットで返してください: [{"index": 0, "text": "翻訳文"}, ...]」
- モデル: gemini-2.5-flash-lite（低コスト重視）
- レート制限を考慮して、チャンク間に適切なディレイ（1秒程度）を入れる

【フロントエンド】
- プロバイダー選択のドロップダウンを追加（利用可能なプロバイダーのみ表示）
- 「翻訳開始」ボタン
- 翻訳の進捗（何チャンク中何チャンク完了）を表示
- 翻訳完了後、原語と日本語を並べてデバッグ表示

【将来の拡張性】
- 新しいプロバイダーを追加するときは以下だけでOKな設計にする:
  1. src/lib/translation/ に新ファイル（例: claude.ts）を作成
  2. index.ts に登録を追加
  3. .env.local にAPIキーを追加
- チャンク戦略や翻訳プロンプトはプロバイダーごとに独自実装できるようにする

エラーハンドリング:
- API呼び出し失敗時はリトライ（最大3回）
- 部分的に失敗した場合、成功したチャンクの結果は保持する

APIキーはサーバーサイド（API Route）でのみ使用し、フロントエンドには露出させないこと。
```

### 完了条件
- プロバイダー選択ドロップダウンにGeminiが表示される
- 字幕取得後「翻訳開始」で日本語翻訳が実行される
- 翻訳の進捗が画面に表示される
- 原語と翻訳文が並んで確認できる
- APIキーがフロントエンドに露出していない
- src/lib/translation/ ディレクトリにプロバイダー関連ファイルが整理されている
- APIキーがフロントエンドに露出していない

---

## ステップ4: 字幕の同期表示

### プロンプト

```
翻訳済み字幕を動画の再生時間に同期して表示する機能を実装してください。

要件:
- src/components/SubtitleDisplay.tsx を作成
  - 現在の再生位置に対応する字幕エントリを検索して表示
  - 動画の下部に字幕を表示（YouTubeの標準字幕のような見た目）
- src/hooks/useSubtitleSync.ts を作成
  - YouTubeプレーヤーの getCurrentTime() を 100ms間隔で監視
  - 現在時刻に該当する SubtitleEntry を返す
  - 二分探索で効率的にエントリを検索する
- 字幕表示のUI:
  - 動画プレーヤーの直下に半透明の黒背景で字幕テキストを表示
  - フォントサイズは調整可能（小・中・大の3段階）
  - 原語テキストも小さく表示するオプション（トグルで切り替え）
- 字幕がない区間では何も表示しない
- 動画の一時停止・シーク時にも正しく字幕が追従する

パフォーマンス:
- 不要な再レンダリングを避けるため、字幕テキストが変わった時のみDOMを更新
- requestAnimationFrame または setInterval（100ms）で監視
```

### 完了条件
- 動画再生中、対応する日本語字幕がリアルタイムで表示される
- シーク（時間ジャンプ）しても字幕が正しく追従する
- フォントサイズの変更ができる
- 原語表示のトグルが動作する

---

## ステップ5: UIの仕上げ

### プロンプト

```
アプリ全体のUIを仕上げ、実用的なツールとして使えるようにしてください。

要件:
- 全体レイアウトの整理:
  - ヘッダー: アプリ名
  - メイン: 動画プレーヤー + 字幕表示（中央配置）
  - サイドまたは下部: 操作パネル（URL入力、字幕取得、翻訳ボタン）
- 状態に応じたUI表示:
  - 初期状態: URL入力欄のみ
  - URL入力済み: 動画プレーヤー + 「字幕取得」ボタン
  - 字幕取得済み: 「翻訳開始」ボタン + 原語字幕プレビュー
  - 翻訳中: プログレスバー
  - 翻訳完了: 字幕同期表示が自動で有効に
- エラーハンドリング:
  - 無効なURL → エラーメッセージ
  - 字幕が見つからない → 「この動画には字幕がありません」メッセージ
  - API エラー → リトライボタン付きエラー表示
- レスポンシブデザイン（モバイルでも使える）
- ダークモード対応（Tailwindのdarkクラス使用）
- キーボードショートカット: スペースで再生/一時停止

不要なデバッグ表示を削除し、すっきりしたUIにすること。
```

### 完了条件
- URL入力から翻訳字幕表示までの一連のフローがスムーズに動作する
- エラー時に適切なメッセージが表示される
- モバイルでも使えるレスポンシブなレイアウト
- 見た目がすっきりしている

---

## トラブルシューティング用プロンプト

### 字幕が取得できない場合

```
YouTube Data API v3 の captions.download で字幕の取得に失敗しています。
エラー: [ここにエラーメッセージを貼る]

代替手段として、以下のアプローチを試してください:
1. YouTubeの非公式 timedtext API（/api/timedtext?v={videoId}&lang=en）を使う
2. それも失敗する場合、youtube-captions-scraper のようなライブラリを使う
3. いずれの方法でも、タイムスタンプ付きの字幕テキストが取得できればOK

現在のコードを最小限の変更で修正してください。
```

### 翻訳品質が悪い場合

```
Gemini APIからの翻訳結果が不自然です。以下の改善を行ってください:

1. GeminiProvider の翻訳プロンプトを以下に変更:
「あなたはYouTube動画の字幕翻訳者です。以下の字幕を日本語に翻訳してください。
 ルール:
 - 動画の内容に合った自然な口語体で翻訳する
 - 専門用語はそのまま残すか、括弧書きで原語を添える
 - 前後の文脈（context）を考慮して一貫性を保つ
 - 短い字幕は簡潔に、長い字幕は読みやすく改行しても良い

 [context] 前のチャンクの最後の訳文:
 {previousTranslations}

 [translate] 以下を翻訳してください:
 {currentChunk}」

2. チャンクサイズを小さくする（15エントリ程度）
3. temperature を 0.3 に下げる
```

### 別の翻訳プロバイダーを追加したい場合

```
新しい翻訳プロバイダー（Claude / DeepL）を追加してください。

要件:
- src/lib/translation/ に新ファイルを作成（例: claude.ts または deepl.ts）
- TranslationProvider インターフェースを実装する
- src/lib/translation/index.ts に新プロバイダーを登録する
- .env.local に対応するAPIキー（ANTHROPIC_API_KEY / DEEPL_API_KEY）を追加
- チャンク戦略と翻訳プロンプトはプロバイダーに最適化して独自に実装する
- フロントエンドのプロバイダー選択ドロップダウンに自動で追加される（APIキーが設定されていれば）

既存のコードには最小限の変更のみ。新ファイルの追加 + index.tsへの登録が主な作業。
```

### 字幕の同期がずれる場合

```
字幕の表示タイミングが動画とずれています。以下を確認・修正してください:

1. getCurrentTime() の呼び出し間隔を 100ms にする（現在の値を確認）
2. 字幕の検索ロジックで、startTime に対して 0.2秒程度のオフセット（早め表示）を入れる
3. 動画のバッファリング状態（playerState === BUFFERING）では字幕更新を一時停止する
4. シーク後に即座に正しい字幕に切り替わることを確認する
```
