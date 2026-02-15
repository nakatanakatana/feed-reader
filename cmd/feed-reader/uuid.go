package main

import (
	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
)

// UUIDGenerator generates UUIDs.
type UUIDGenerator interface {
	store.UUIDGenerator
}

type realUUIDGenerator struct{}

// NewRandom generates a new random UUID using github.com/google/uuid.
func (realUUIDGenerator) NewRandom() (uuid.UUID, error) {
	return uuid.NewRandom()
}
