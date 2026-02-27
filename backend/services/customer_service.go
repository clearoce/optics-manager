package services

import (
	"context"
	"database/sql"
	"errors"
	"optics-manager/database"
	"optics-manager/models"
)

type customerService struct {
	db *sql.DB
}

func (s *customerService) CreateCustomer(ctx context.Context, input CustomerCreateInput) (int64, error) {
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?)`,
		input.Name,
		input.Phone,
		input.Notes,
	)
	if err != nil {
		return 0, err
	}

	newID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return newID, nil
}

func (s *customerService) GetCustomers(ctx context.Context, phone string) ([]models.Customer, error) {
	query := `SELECT id, name, phone, notes, created_at FROM customers ORDER BY created_at DESC`
	args := []any{}
	if phone != "" {
		query = `SELECT id, name, phone, notes, created_at FROM customers WHERE phone LIKE ? ORDER BY created_at DESC`
		args = append(args, "%"+phone+"%")
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	customers := make([]models.Customer, 0)
	for rows.Next() {
		var customer models.Customer
		var createdAtStr string
		if err := rows.Scan(&customer.ID, &customer.Name, &customer.Phone, &customer.Notes, &createdAtStr); err != nil {
			return nil, err
		}
		if t, err := database.ParseTime(createdAtStr); err == nil {
			customer.CreatedAt = t
		}
		customers = append(customers, customer)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return customers, nil
}

func (s *customerService) GetCustomerByID(ctx context.Context, id int64) (models.Customer, error) {
	var customer models.Customer
	var createdAtStr string
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, name, phone, notes, created_at FROM customers WHERE id = ?`,
		id,
	).Scan(&customer.ID, &customer.Name, &customer.Phone, &customer.Notes, &createdAtStr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Customer{}, ErrCustomerNotFound
		}
		return models.Customer{}, err
	}
	if t, err := database.ParseTime(createdAtStr); err == nil {
		customer.CreatedAt = t
	}

	return customer, nil
}

func (s *customerService) UpdateCustomer(ctx context.Context, id int64, input CustomerUpdateInput) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ?`,
		input.Name,
		input.Phone,
		input.Notes,
		id,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrCustomerNotFound
	}

	return nil
}
