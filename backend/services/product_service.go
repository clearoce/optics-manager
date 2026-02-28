package services

import (
	"context"
	"database/sql"
	"errors"
	"optics-manager/database"
	"optics-manager/models"
	"strings"
)

type productService struct {
	db *sql.DB
}

func (s *productService) CreateProduct(ctx context.Context, input ProductCreateInput) (int64, error) {
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO products (name, category, sku, price, extra_info) VALUES (?, '', lower(hex(randomblob(16))), ?, ?)`,
		input.Name,
		input.Price,
		input.ExtraInfo,
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

func (s *productService) GetProducts(ctx context.Context) ([]models.Product, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, price, extra_info, created_at, deleted_at FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]models.Product, 0)
	for rows.Next() {
		var p models.Product
		var createdAtStr string
		var deletedAt sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.ExtraInfo, &createdAtStr, &deletedAt); err != nil {
			return nil, err
		}
		if t, err := database.ParseTime(createdAtStr); err == nil {
			p.CreatedAt = t
		}
		if deletedAt.Valid && strings.TrimSpace(deletedAt.String) != "" {
			if t, err := database.ParseTime(deletedAt.String); err == nil {
				p.DeletedAt = &t
			}
		}
		products = append(products, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return products, nil
}

func (s *productService) GetProductByID(ctx context.Context, id int64) (models.Product, error) {
	var p models.Product
	var createdAtStr string
	var deletedAt sql.NullString
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, name, price, extra_info, created_at, deleted_at FROM products WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&p.ID, &p.Name, &p.Price, &p.ExtraInfo, &createdAtStr, &deletedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Product{}, ErrProductNotFound
		}
		return models.Product{}, err
	}
	if t, err := database.ParseTime(createdAtStr); err == nil {
		p.CreatedAt = t
	}
	if deletedAt.Valid && strings.TrimSpace(deletedAt.String) != "" {
		if t, err := database.ParseTime(deletedAt.String); err == nil {
			p.DeletedAt = &t
		}
	}

	return p, nil
}

func (s *productService) UpdateProduct(ctx context.Context, id int64, input ProductUpdateInput) error {
	result, err := s.db.ExecContext(
		ctx,
		`UPDATE products SET name = ?, price = ?, extra_info = ? WHERE id = ? AND deleted_at IS NULL`,
		input.Name,
		input.Price,
		input.ExtraInfo,
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
		return ErrProductNotFound
	}

	return nil
}

func (s *productService) DeleteProduct(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, `UPDATE products SET deleted_at = datetime('now', '+8 hours') WHERE id = ? AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrProductNotFound
	}

	return nil
}
