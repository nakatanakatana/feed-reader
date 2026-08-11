package store

import (
	"context"
	"reflect"
	"time"
)

const (
	sqliteBusy   = 5
	sqliteLocked = 6
)

const (
	maxRetries   = 10
	initialDelay = 10 * time.Millisecond
	maxDelay     = 100 * time.Millisecond
)

// IsBusyError returns true if the error is a SQLite busy or locked error.
func IsBusyError(err error) bool {
	visited := make(map[error]bool)
	return isBusyWalk(err, visited)
}

func isBusyWalk(err error, visited map[error]bool) bool {
	if err == nil || visited[err] {
		return false
	}
	visited[err] = true

	if hasBusyCode(err) {
		return true
	}

	if u, ok := err.(interface{ Unwrap() error }); ok {
		if isBusyWalk(u.Unwrap(), visited) {
			return true
		}
	}

	if u, ok := err.(interface{ Unwrap() []error }); ok {
		for _, inner := range u.Unwrap() {
			if isBusyWalk(inner, visited) {
				return true
			}
		}
	}

	return false
}

func hasBusyCode(err error) (found bool) {
	defer func() {
		if recover() != nil {
			found = false
		}
	}()

	v := reflect.ValueOf(err)
	if !v.IsValid() {
		return false
	}
	m := v.MethodByName("Code")
	if !m.IsValid() || m.Type().NumIn() != 0 || m.Type().NumOut() != 1 {
		return false
	}

	out := m.Type().Out(0)
	switch out.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		code := m.Call(nil)[0].Int()
		return code == sqliteBusy || code == sqliteLocked
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		code := m.Call(nil)[0].Uint()
		return code == sqliteBusy || code == sqliteLocked
	default:
		return false
	}
}

// WithRetry executes the given operation and retries if it encounters a SQLite busy error.
func WithRetry(ctx context.Context, op func() error) error {
	var err error
	delay := initialDelay

	for i := range maxRetries {
		err = op()
		if err == nil {
			return nil
		}

		if !IsBusyError(err) {
			return err
		}

		if i == maxRetries-1 {
			return err
		}

		select {
		case <-time.After(delay):
			delay *= 2
			if delay > maxDelay {
				delay = maxDelay
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return err
}
