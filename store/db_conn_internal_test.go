package store

import (
	"errors"
	"testing"
)

type foreignKeyCheckRowsStub struct{ err error }

func (s foreignKeyCheckRowsStub) Next() bool        { return false }
func (s foreignKeyCheckRowsStub) Scan(...any) error { return nil }
func (s foreignKeyCheckRowsStub) Err() error        { return s.err }

func TestCollectForeignKeyViolationsReturnsIterationError(t *testing.T) {
	expected := errors.New("iteration failed")

	_, err := collectForeignKeyViolations(foreignKeyCheckRowsStub{err: expected})

	if !errors.Is(err, expected) {
		t.Errorf("collectForeignKeyViolations() error = %v, want error wrapping %v", err, expected)
	}
}
