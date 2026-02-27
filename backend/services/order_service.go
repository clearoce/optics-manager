package services

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"optics-manager/database"
	"optics-manager/models"
)

type orderService struct {
	db *sql.DB
}

type productSnapshot struct {
	Name     string
	Category string
	SKU      *string
	Price    float64
}

func (s *orderService) CreateOrder(ctx context.Context, input OrderCreateInput) (int64, float64, error) {
	if err := s.ensureCustomerExists(ctx, input.CustomerID); err != nil {
		return 0, 0, err
	}

	productMap, err := s.loadProductSnapshotMap(ctx, input.Items)
	if err != nil {
		return 0, 0, err
	}

	totalAmount := input.TotalAmount
	if !isValidOrderTotal(totalAmount) {
		return 0, 0, ErrInvalidOrderTotal
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	result, err := tx.ExecContext(
		ctx,
		`INSERT INTO orders (customer_id, total_amount, notes, extra_info) VALUES (?, ?, ?, ?)`,
		input.CustomerID,
		totalAmount,
		input.Notes,
		input.ExtraInfo,
	)
	if err != nil {
		return 0, 0, err
	}

	orderID, err := result.LastInsertId()
	if err != nil {
		return 0, 0, err
	}

	for _, item := range input.Items {
		subtotal := item.PaidPrice * float64(item.Quantity)
		productSnapshot := productMap[item.ProductID]
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO order_items (order_id, product_id, product_name_snapshot, product_sku_snapshot, product_category_snapshot, quantity, unit_price, paid_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			orderID,
			item.ProductID,
			productSnapshot.Name,
			productSnapshot.SKU,
			productSnapshot.Category,
			item.Quantity,
			productSnapshot.Price,
			item.PaidPrice,
			subtotal,
		); err != nil {
			return 0, 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}
	committed = true

	return orderID, totalAmount, nil
}

func (s *orderService) GetOrders(ctx context.Context, customerID *int64) ([]models.Order, error) {
	query := `SELECT id, customer_id, total_amount, order_date, notes, extra_info FROM orders ORDER BY order_date DESC`
	args := []any{}
	if customerID != nil {
		query = `SELECT id, customer_id, total_amount, order_date, notes, extra_info FROM orders WHERE customer_id = ? ORDER BY order_date DESC`
		args = append(args, *customerID)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		var orderDateStr string
		if err := rows.Scan(&o.ID, &o.CustomerID, &o.TotalAmount, &orderDateStr, &o.Notes, &o.ExtraInfo); err != nil {
			return nil, err
		}
		if t, err := database.ParseTime(orderDateStr); err == nil {
			o.OrderDate = t
		}
		orders = append(orders, o)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return orders, nil
}

func (s *orderService) GetOrderDetail(ctx context.Context, id int64) (models.OrderDetail, error) {
	order, err := s.getOrderByID(ctx, id)
	if err != nil {
		return models.OrderDetail{}, err
	}

	itemsRows, err := s.db.QueryContext(
		ctx,
		`SELECT id, order_id, product_id, product_name_snapshot, product_sku_snapshot, product_category_snapshot, quantity, unit_price, paid_price, subtotal FROM order_items WHERE order_id = ?`,
		id,
	)
	if err != nil {
		return models.OrderDetail{}, err
	}
	defer itemsRows.Close()

	items := make([]models.OrderItem, 0)
	for itemsRows.Next() {
		var item models.OrderItem
		if err := itemsRows.Scan(
			&item.ID,
			&item.OrderID,
			&item.ProductID,
			&item.ProductNameSnapshot,
			&item.ProductSKUSnapshot,
			&item.ProductCategorySnapshot,
			&item.Quantity,
			&item.UnitPrice,
			&item.PaidPrice,
			&item.Subtotal,
		); err != nil {
			return models.OrderDetail{}, err
		}
		items = append(items, item)
	}

	if err := itemsRows.Err(); err != nil {
		return models.OrderDetail{}, err
	}

	return models.OrderDetail{Order: order, Items: items}, nil
}

func (s *orderService) UpdateOrder(ctx context.Context, id int64, input OrderUpdateInput) (float64, error) {
	if err := s.ensureOrderExists(ctx, id); err != nil {
		return 0, err
	}

	if err := s.ensureCustomerExists(ctx, input.CustomerID); err != nil {
		return 0, err
	}

	productMap, err := s.loadProductSnapshotMap(ctx, input.Items)
	if err != nil {
		return 0, err
	}

	totalAmount := input.TotalAmount
	if !isValidOrderTotal(totalAmount) {
		return 0, ErrInvalidOrderTotal
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	result, err := tx.ExecContext(
		ctx,
		`UPDATE orders SET customer_id = ?, total_amount = ?, notes = ?, extra_info = ? WHERE id = ?`,
		input.CustomerID,
		totalAmount,
		input.Notes,
		input.ExtraInfo,
		id,
	)
	if err != nil {
		return 0, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	if rowsAffected == 0 {
		return 0, ErrOrderNotFound
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM order_items WHERE order_id = ?`, id); err != nil {
		return 0, err
	}

	for _, item := range input.Items {
		subtotal := item.PaidPrice * float64(item.Quantity)
		productSnapshot := productMap[item.ProductID]
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO order_items (order_id, product_id, product_name_snapshot, product_sku_snapshot, product_category_snapshot, quantity, unit_price, paid_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id,
			item.ProductID,
			productSnapshot.Name,
			productSnapshot.SKU,
			productSnapshot.Category,
			item.Quantity,
			productSnapshot.Price,
			item.PaidPrice,
			subtotal,
		); err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	committed = true

	return totalAmount, nil
}

func (s *orderService) DeleteOrder(ctx context.Context, id int64) error {
	if err := s.ensureOrderExists(ctx, id); err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if _, err := tx.ExecContext(ctx, `DELETE FROM order_items WHERE order_id = ?`, id); err != nil {
		return err
	}

	result, err := tx.ExecContext(ctx, `DELETE FROM orders WHERE id = ?`, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrOrderNotFound
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true

	return nil
}

func (s *orderService) ensureCustomerExists(ctx context.Context, customerID int64) error {
	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM customers WHERE id = ?`, customerID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists == 0 {
		return ErrCustomerNotFound
	}
	return nil
}

func (s *orderService) ensureOrderExists(ctx context.Context, orderID int64) error {
	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM orders WHERE id = ?`, orderID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists == 0 {
		return ErrOrderNotFound
	}
	return nil
}

func (s *orderService) loadProductSnapshotMap(ctx context.Context, items []OrderItemInput) (map[int64]productSnapshot, error) {
	productMap := make(map[int64]productSnapshot)

	for _, item := range items {
		if _, exists := productMap[item.ProductID]; exists {
			continue
		}

		var snapshot productSnapshot
		err := s.db.QueryRowContext(
			ctx,
			`SELECT name, category, sku, price FROM products WHERE id = ? AND deleted_at IS NULL`,
			item.ProductID,
		).Scan(&snapshot.Name, &snapshot.Category, &snapshot.SKU, &snapshot.Price)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ProductNotFoundInOrderError{ProductID: item.ProductID}
			}
			return nil, err
		}

		productMap[item.ProductID] = snapshot
	}

	return productMap, nil
}

func (s *orderService) getOrderByID(ctx context.Context, id int64) (models.Order, error) {
	var o models.Order
	var orderDateStr string
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, customer_id, total_amount, order_date, notes, extra_info FROM orders WHERE id = ?`,
		id,
	).Scan(&o.ID, &o.CustomerID, &o.TotalAmount, &orderDateStr, &o.Notes, &o.ExtraInfo)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Order{}, ErrOrderNotFound
		}
		return models.Order{}, err
	}

	if t, err := database.ParseTime(orderDateStr); err == nil {
		o.OrderDate = t
	}

	return o, nil
}

func isValidOrderTotal(amount float64) bool {
	if amount <= 0 {
		return false
	}
	if math.IsNaN(amount) || math.IsInf(amount, 0) {
		return false
	}
	return true
}
