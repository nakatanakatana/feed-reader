# Implementation Plan: Add Explicit Verification Commands to Workflow

## Phase 1: Preparation
- [x] Task: 既存の `conductor/workflow.md` の内容を再確認し、追記箇所のインデントやスタイルを特定する

## Phase 2: Implementation
- [x] Task: `conductor/workflow.md` の "Definition of Done" セクションを修正する [3b0fc6f]
    - [x] 既存の「5. Code passes all configured linting and static analysis checks」をより具体的な手順に置き換える、または直後に具体的なコマンドを追記する。
    - [x] `go fmt ./...`, `golangci-lint run`, `go test ./...`, `go build -o dist/ ./cmd/...` の4つのコマンドを明記する。

## Phase 3: Verification
- [ ] Task: 修正後の `conductor/workflow.md` の表示を確認する
- [ ] Task: 追記されたコマンドが現在のプロジェクト構成で実行可能であることを（必要に応じて）確認する

## Phase 4: Finalization
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
