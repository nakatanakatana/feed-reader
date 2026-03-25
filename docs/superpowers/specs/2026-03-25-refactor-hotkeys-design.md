# Spec: Refactor Shortcuts with TanStack Hotkeys

リフレクタリングの目的: 現在の `keydown` イベントベースのショートカットキー実装を、`@tanstack/solid-hotkeys` を使用したスコープ管理および型安全な実装へ移行する。

## 1. 背景と目的
現在のプロジェクトでは、`window.addEventListener("keydown", ...)` や JSX の `onKeyDown` プロップを使用してショートカットキー（アイテムの更新、モーダルの操作、ナビゲーション等）を実装している。
これらを `@tanstack/solid-hotkeys` に移行することで、以下の改善を図る：
- **スコープ管理**: モーダル表示時などのコンテキストに応じたキーの有効/無効化を宣言的に行う。
- **型安全**: ホットキー文字列の検証。
- **標準化**: 入力要素フォーカス時の除外処理などの定型的なロジックをライブラリに任せる。
- **一貫性**: `Mod` キー（MacのCmd、Win/LinuxのCtrl）の自動解決。

## 2. 変更範囲

### 2.1. グローバルショートカット (`frontend/src/routes/_items.tsx`)
- `r` キーによるアイテム更新機能を `createHotkey` に移行。
- デフォルトスコープ (`global`) で定義。

### 2.2. アイテム詳細モーダル (`frontend/src/components/ItemDetailModal.tsx`)
- `h/j/k/l` (移動), `m` (既読切り替え), `n` (スキップ) などの多数のキーを `createHotkeys` で一括管理。
- `ItemDetail` スコープを割り当て、モーダル表示中のみ有効化。
- 入力要素フォーカス時の除外チェック（既存の `handleKeyDown` 内のロジック）をライブラリの標準機能に置き換え。

### 2.3. 汎用モーダル (`frontend/src/components/ui/Modal.tsx`)
- `Escape` (閉じる) と `Tab` / `Shift+Tab` (フォーカス・トラップ) を `createHotkey` に移行。
- `Modal` スコープを割り当て。
- **フォーカス・トラップ**: `Tab` キーをキャプチャし、既存のループ処理ロジックを実行する。

## 3. 技術的詳細

### 3.1. 使用パッケージ
- `@tanstack/solid-hotkeys` (SolidJS 用プリミティブ)

### 3.2. スコープ階層
- `global` (基盤)
- `modal` (優先度高)
- `item-detail` (優先度最高、`modal` スコープの内容も包含または併用)

### 3.3. 実装のポイント
- `createHotkey` の `enabled` オプションや `useHotkeysScope` (または相当する Solid プリミティブ) を使用して、モーダルの表示状態と連動させる。
- `Tab` キーのデフォルト挙動を `preventDefault()` で抑制し、既存のフォーカス移動ロジックを継続して使用する。

## 4. テストと検証
- 既存のテストスイート (`frontend/src/components/ItemDetailModal.Shortcut.test.tsx` 等) がすべてパスすることを確認。
- 手動検証:
  - モーダル表示中にグローバルキー (`r`) が発火しないこと。
  - 入力要素フォーカス中にショートカットが反応しないこと。
  - モーダル内での `Tab` キーによるフォーカス・トラップが維持されていること。

## 5. 移行手順
1. `@tanstack/solid-hotkeys` をインストール。
2. `Modal.tsx` の `Escape` / `Tab` 処理を移行。
3. `ItemDetailModal.tsx` の各種ナビゲーションキーを移行。
4. `_items.tsx` のグローバルキーを移行。
5. 不要になった `keydown` イベントリスナーおよび手動の入力要素チェックロジックを削除。
