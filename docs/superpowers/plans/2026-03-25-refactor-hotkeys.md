# Refactor Shortcuts with TanStack Hotkeys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@tanstack/solid-hotkeys` を導入し、既存の `keydown` イベントベースのショートカット機能をスコープ管理された実装へリプレイスする。

**Architecture:** アプリケーション全体で `global`, `modal`, `item-detail` の 3 つのスコープを定義し、コンテキストに応じてホットキーを有効化する。`Modal.tsx` では `Tab` キーによるフォーカス・トラップもホットキーとして管理し、`ItemDetailModal.tsx` では多数のナビゲーションキーを一括管理する。

**Tech Stack:** `@tanstack/solid-hotkeys`, SolidJS, Vitest

---

### Task 1: パッケージのインストールと準備

**Files:**
- Modify: `package.json`

- [x] **Step 1: `@tanstack/solid-hotkeys` をインストールする**
- [x] **Step 2: 依存関係の整合性を確認する**
- [x] **Step 3: インストール成功を確認する**
- [x] **Step 4: コミット**

---

### Task 2: Modal コンポーネントのリファクタリング（Escape & Tab）

**Files:**
- Modify: `frontend/src/components/ui/Modal.tsx`

- [ ] **Step 1: 既存のテストがパスすることを確認する**
- [ ] **Step 2: `Modal` スコープの定義と `createHotkey` への移行**
- [ ] **Step 3: 既存の `onKeyDown` ハンドラと手動のキーチェックを削除する**
- [ ] **Step 4: テストを実行して挙動を確認する**
- [ ] **Step 5: コミット**

---

### Task 3: ItemDetailModal のリファクタリング

**Files:**
- Modify: `frontend/src/components/ItemDetailModal.tsx`
- Test: `frontend/src/components/ItemDetailModal.Shortcut.test.tsx`

- [ ] **Step 1: 既存のショートカットテストを実行する**
- [ ] **Step 2: `item-detail` スコープの定義と `createHotkeys` への移行**
- [ ] **Step 3: `handleKeyDown` 関数と `Modal` への `onKeyDown` 渡しを削除する**
- [ ] **Step 4: テストを再実行してパスすることを確認する**
- [ ] **Step 5: コミット**

---

### Task 4: グローバルショートカットの移行 (_items.tsx)

**Files:**
- Modify: `frontend/src/routes/_items.tsx`

- [ ] **Step 1: `r` キーを `createHotkey` に移行する**
- [ ] **Step 2: `onMount` 内の `window.addEventListener("keydown", ...)` を削除する**
- [ ] **Step 3: 手動で動作確認（リフレッシュが動作し、モーダル表示中は発火しないこと）**
- [ ] **Step 4: コミット**

---

### Task 5: 最終確認とクリーンアップ

- [ ] **Step 1: プロジェクト全体のテストを実行する**
- [ ] **Step 2: `Modal.tsx` の `Tab` キーロジックが重複していないか再確認する**
- [ ] **Step 3: 最終コミット**
