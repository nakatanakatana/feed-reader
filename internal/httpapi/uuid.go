package httpapi

import (
	"github.com/google/uuid"
	"github.com/nakatanakatana/feed-reader/store"
)

type realUUIDGenerator struct{}

func (realUUIDGenerator) NewRandom() (uuid.UUID, error) {
	return uuid.NewRandom()
}

var _ store.UUIDGenerator = realUUIDGenerator{}
