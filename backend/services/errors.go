package services

import (
	"errors"
	"fmt"
)

var (
	ErrCustomerNotFound    = errors.New("customer not found")
	ErrProductNotFound     = errors.New("product not found")
	ErrOrderNotFound       = errors.New("order not found")
	ErrInvalidOrderTotal   = errors.New("invalid order total amount")
	ErrInvalidVisionRecord = errors.New("invalid customer vision record")
)

type ProductNotFoundInOrderError struct {
	ProductID int64
}

func (e ProductNotFoundInOrderError) Error() string {
	return fmt.Sprintf("product not found in order: id=%d", e.ProductID)
}

func IsProductNotFoundInOrderError(err error) bool {
	var target ProductNotFoundInOrderError
	return errors.As(err, &target)
}
