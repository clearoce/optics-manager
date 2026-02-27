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
	normalizedSKU := normalizeOptionalString(input.SKU)

	if normalizedSKU != nil {
		var (
			existingID int64
			deletedAt  sql.NullString
		)

		err := s.db.QueryRowContext(
			ctx,
			`SELECT id, deleted_at FROM products WHERE sku = ? LIMIT 1`,
			normalizedSKU,
		).Scan(&existingID, &deletedAt)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return 0, err
		}

		if err == nil {
			if deletedAt.Valid && strings.TrimSpace(deletedAt.String) != "" {
				result, updateErr := s.db.ExecContext(
					ctx,
					`UPDATE products SET name = ?, category = ?, sku = ?, price = ?, extra_info = ?, deleted_at = NULL WHERE id = ?`,
					input.Name,
					input.Category,
					normalizedSKU,
					input.Price,
					input.ExtraInfo,
					existingID,
				)
				if updateErr != nil {
					return 0, updateErr
				}

				rowsAffected, rowsErr := result.RowsAffected()
				if rowsErr != nil {
					return 0, rowsErr
				}
				if rowsAffected == 0 {
					return 0, ErrProductNotFound
				}

				return existingID, nil
			}

			return 0, ErrProductSKUAlreadyExists
		}
	}

	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO products (name, category, sku, price, extra_info) VALUES (?, ?, ?, ?, ?)`,
		input.Name,
		input.Category,
		normalizedSKU,
		input.Price,
		input.ExtraInfo,
	)
	if err != nil {
		if isProductSKUUniqueConstraintError(err) {
			return 0, ErrProductSKUAlreadyExists
		}
		return 0, err
	}

	newID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return newID, nil
}

func (s *productService) GetProducts(ctx context.Context, category string) ([]models.Product, error) {
	query := `SELECT id, name, category, sku, price, extra_info, created_at, deleted_at FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC`
	args := []any{}
	if category != "" {
		query = `SELECT id, name, category, sku, price, extra_info, created_at, deleted_at FROM products WHERE deleted_at IS NULL AND category = ? ORDER BY created_at DESC`
		args = append(args, category)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]models.Product, 0)
	for rows.Next() {
		var p models.Product
		var createdAtStr string
		var deletedAt sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.SKU, &p.Price, &p.ExtraInfo, &createdAtStr, &deletedAt); err != nil {
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
		`SELECT id, name, category, sku, price, extra_info, created_at, deleted_at FROM products WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&p.ID, &p.Name, &p.Category, &p.SKU, &p.Price, &p.ExtraInfo, &createdAtStr, &deletedAt)
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
		`UPDATE products SET name = ?, category = ?, price = ?, extra_info = ? WHERE id = ? AND deleted_at IS NULL`,
		input.Name,
		input.Category,
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

func normalizeOptionalString(input *string) *string {
	if input == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*input)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func isProductSKUUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}

	errText := err.Error()
	return strings.Contains(errText, "UNIQUE constraint failed") && strings.Contains(errText, "products.sku")
}
