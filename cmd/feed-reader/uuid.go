package main

import "github.com/google/uuid"

// UUIDGenerator generates UUIDs.
type UUIDGenerator interface {
	NewRandom() (uuid.UUID, error)
}

type realUUIDGenerator struct{}

// NewRandom generates a new random UUID using github.com/google/uuid.
func (realUUIDGenerator) NewRandom() (uuid.UUID, error) {
	return uuid.NewRandom()
}
