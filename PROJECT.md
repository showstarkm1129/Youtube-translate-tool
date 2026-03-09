# YouTube字幕翻訳プレーヤー - プロジェクト概要

## 概要
YouTubeの海外動画に対して、自動生成字幕（原語）を取得し、LLMで高品質な日本語翻訳を行い、動画と同期して表示するWebアプリケーション。

## 技術スタック
- **フレームワーク**: Next.js (React)
- **字幕取得**: YouTube Data API v3
- **翻訳**: プロバイダー差し替え可能（初期実装: Gemini Flash 2.5 Lite API、将来: Claude, DeepL等）
- **動画再生**: YouTube IFrame Player API
- **言語**: TypeScript

## アーキテクチャ

```
[ユーザー] → YouTube URL入力
    ↓
[YouTube Data API v3] → 字幕データ取得（原語・タイムスタンプ付き）
    ↓
[翻訳プロバイダー] → 日本語翻訳（前後の文脈を含めてチャンク単位で翻訳）
                      ├── GeminiProvider（デフォルト）
                      ├── ClaudeProvider（将来追加）
                      └── DeepLProvider（将来追加）
    ↓
[YouTube IFrame Player] → 動画再生 + getCurrentTime()で再生位置を監視
    ↓
[字幕表示コンポーネント] → タイムスタンプと照合して翻訳字幕を同期表示
```

## ディレクトリ構成（予定）

```
youtube-subtitle-translator/
├── src/
│   ├── app/
│   │   ├── page.tsx              # メインページ
│   │   └── api/
│   │       ├── subtitles/route.ts  # 字幕取得APIエンドポイント
│   │       └── translate/route.ts  # 翻訳APIエンドポイント
│   ├── components/
│   │   ├── VideoPlayer.tsx        # YouTube IFrame Player ラッパー
│   │   ├── SubtitleDisplay.tsx    # 字幕同期表示コンポーネント
│   │   ├── UrlInput.tsx           # URL入力フォーム
│   │   └── LoadingIndicator.tsx   # ローディング表示
│   ├── lib/
│   │   ├── youtube-api.ts         # YouTube Data API v3 ヘルパー
│   │   ├── translation/
│   │   │   ├── provider.ts        # TranslationProvider インターフェース定義
│   │   │   ├── gemini.ts          # Gemini実装
│   │   │   └── index.ts           # プロバイダー登録・取得
│   │   ├── subtitle-parser.ts     # 字幕パーサー（タイムスタンプ処理）
│   │   └── types.ts               # 型定義
│   └── hooks/
│       ├── useYouTubePlayer.ts    # プレーヤー制御Hook
│       └── useSubtitleSync.ts     # 字幕同期Hook
├── .env.local                     # APIキー（YOUTUBE_API_KEY, GEMINI_API_KEY）
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 型定義

```typescript
// 字幕の1エントリ
interface SubtitleEntry {
  startTime: number;   // 開始時間（秒）
  endTime: number;     // 終了時間（秒）
  originalText: string; // 原語テキスト
  translatedText: string; // 翻訳済みテキスト
}

// 翻訳リクエスト用チャンク
interface TranslationChunk {
  entries: SubtitleEntry[];
  contextBefore?: string;  // 前のチャンクの最後の数行（文脈用）
}

// 翻訳プロバイダーのインターフェース
interface TranslationProvider {
  name: string;                    // 表示名（"Gemini", "Claude" 等）
  translate(
    entries: SubtitleEntry[],
    context?: string
  ): Promise<SubtitleEntry[]>;
}

// 利用可能なプロバイダーID
type ProviderId = "gemini" | "claude" | "deepl";
```

## APIキーの管理
`.env.local` に以下を設定:
```
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
# 将来追加するプロバイダー用（必要に応じて）
# ANTHROPIC_API_KEY=your_anthropic_api_key
# DEEPL_API_KEY=your_deepl_api_key
```
フロントエンドからは直接APIキーを使わず、Next.jsのAPI Routes（`/api/subtitles`, `/api/translate`）を経由する。

## 開発ステップ
1. プロジェクトセットアップ + YouTube IFrame Player で動画再生
2. YouTube Data API v3 で字幕データ取得
3. 翻訳プロバイダーの抽象化 + Gemini実装
4. 字幕の同期表示
5. UIの仕上げ・エラーハンドリング

## 既知のリスク
- YouTube Data API v3 の captions エンドポイントで第三者の動画の字幕本文を取得するにはOAuth 2.0が必要になる可能性がある。APIキーのみでは取得できない場合、代替手段（非公式API等）を検討する。
- Geminiの翻訳品質はプロンプト設計に大きく依存する。文脈を適切に渡すチャンク戦略が重要。
