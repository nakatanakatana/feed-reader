package main

import (
	"testing"

	"pgregory.net/rapid"
)

func TestPBTSelfCheck(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		n := rapid.Int().Draw(t, "n")
		if n+n != 2*n {
			t.Fatalf("Addition is not multiplication by 2: %d", n)
		}
	})
}
