package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"optics-manager/database"
	"optics-manager/models"
	"strings"
	"time"
)

type customerService struct {
	db *sql.DB
}

func (s *customerService) CreateCustomer(ctx context.Context, input CustomerCreateInput) (int64, error) {
	normalizedRecords, err := normalizeVisionRecords(input.VisionRecords)
	if err != nil {
		return 0, err
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

	if err := s.replaceVisionRecordsTx(ctx, tx, newID, normalizedRecords); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	committed = true

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

		visionRecords, err := s.getVisionRecordsByCustomerID(ctx, customer.ID)
		if err != nil {
			return nil, err
		}
		customer.VisionRecords = visionRecords

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

	visionRecords, err := s.getVisionRecordsByCustomerID(ctx, customer.ID)
	if err != nil {
		return models.Customer{}, err
	}
	customer.VisionRecords = visionRecords

	return customer, nil
}

func (s *customerService) UpdateCustomer(ctx context.Context, id int64, input CustomerUpdateInput) error {
	normalizedRecords, err := normalizeVisionRecords(input.VisionRecords)
	if err != nil {
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

	result, err := tx.ExecContext(
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

	if err := s.replaceVisionRecordsTx(ctx, tx, id, normalizedRecords); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true

	return nil
}

func (s *customerService) AppendCustomerVisionRecords(ctx context.Context, id int64, records []CustomerVisionRecordInput) error {
	normalizedRecords, err := normalizeVisionRecords(records)
	if err != nil {
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

	exists, err := s.customerExistsTx(ctx, tx, id)
	if err != nil {
		return err
	}
	if !exists {
		return ErrCustomerNotFound
	}

	if err := s.appendVisionRecordsTx(ctx, tx, id, normalizedRecords); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	committed = true

	return nil
}

func (s *customerService) DeleteCustomer(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM customers WHERE id = ?`, id)
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

func (s *customerService) getVisionRecordsByCustomerID(ctx context.Context, customerID int64) ([]models.CustomerVisionData, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, customer_id, recorded_at,
			left_sphere, left_cylinder, left_axis, left_pd, left_visual_acuity,
			right_sphere, right_cylinder, right_axis, right_pd, right_visual_acuity,
			created_at
		FROM customer_vision_records
		WHERE customer_id = ?
		ORDER BY recorded_at DESC, id DESC`,
		customerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]models.CustomerVisionData, 0)
	for rows.Next() {
		var record models.CustomerVisionData
		var recordedAtStr string
		var createdAtStr string

		if err := rows.Scan(
			&record.ID,
			&record.CustomerID,
			&recordedAtStr,
			&record.LeftSphere,
			&record.LeftCylinder,
			&record.LeftAxis,
			&record.LeftPD,
			&record.LeftVisualAcuity,
			&record.RightSphere,
			&record.RightCylinder,
			&record.RightAxis,
			&record.RightPD,
			&record.RightVisualAcuity,
			&createdAtStr,
		); err != nil {
			return nil, err
		}

		if t, err := database.ParseTime(recordedAtStr); err == nil {
			record.RecordedAt = t
		}
		if t, err := database.ParseTime(createdAtStr); err == nil {
			record.CreatedAt = t
		}

		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return records, nil
}

func normalizeVisionRecords(records []CustomerVisionRecordInput) ([]CustomerVisionRecordInput, error) {
	normalized := make([]CustomerVisionRecordInput, 0, len(records))
	for i, record := range records {
		if err := validateVisionRecord(record); err != nil {
			return nil, fmt.Errorf("%w: 第 %d 组参数: %v", ErrInvalidVisionRecord, i+1, err)
		}

		mapped := record
		mapped.LeftSphere = strings.TrimSpace(record.LeftSphere)
		mapped.LeftCylinder = roundTo(record.LeftCylinder, 2)
		mapped.LeftPD = roundTo(record.LeftPD, 2)
		mapped.LeftVisualAcuity = strings.TrimSpace(record.LeftVisualAcuity)
		mapped.RightSphere = strings.TrimSpace(record.RightSphere)
		mapped.RightCylinder = roundTo(record.RightCylinder, 2)
		mapped.RightPD = roundTo(record.RightPD, 2)
		mapped.RightVisualAcuity = strings.TrimSpace(record.RightVisualAcuity)

		if mapped.RecordedAt == nil {
			now := time.Now().In(time.Local)
			mapped.RecordedAt = &now
		}

		normalized = append(normalized, mapped)
	}

	return normalized, nil
}

func validateVisionRecord(record CustomerVisionRecordInput) error {
	values := []struct {
		name  string
		value float64
	}{
		{name: "left_cylinder", value: record.LeftCylinder},
		{name: "left_pd", value: record.LeftPD},
		{name: "right_cylinder", value: record.RightCylinder},
		{name: "right_pd", value: record.RightPD},
	}

	for _, value := range values {
		if math.IsNaN(value.value) || math.IsInf(value.value, 0) {
			return fmt.Errorf("%s 不是有效数字", value.name)
		}
	}

	if record.LeftAxis < 0 || record.LeftAxis > 180 {
		return fmt.Errorf("left_axis 必须在 0 到 180 之间")
	}
	if record.RightAxis < 0 || record.RightAxis > 180 {
		return fmt.Errorf("right_axis 必须在 0 到 180 之间")
	}

	return nil
}

func (s *customerService) replaceVisionRecordsTx(ctx context.Context, tx *sql.Tx, customerID int64, records []CustomerVisionRecordInput) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM customer_vision_records WHERE customer_id = ?`, customerID); err != nil {
		return err
	}

	return s.appendVisionRecordsTx(ctx, tx, customerID, records)
}

func (s *customerService) appendVisionRecordsTx(ctx context.Context, tx *sql.Tx, customerID int64, records []CustomerVisionRecordInput) error {

	for _, record := range records {
		recordedAt := time.Now().In(time.Local)
		if record.RecordedAt != nil {
			recordedAt = record.RecordedAt.In(time.Local)
		}

		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO customer_vision_records (
				customer_id, recorded_at,
				left_sphere, left_cylinder, left_axis, left_pd, left_visual_acuity,
				right_sphere, right_cylinder, right_axis, right_pd, right_visual_acuity
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			customerID,
			recordedAt.Format("2006-01-02 15:04:05"),
			record.LeftSphere,
			record.LeftCylinder,
			record.LeftAxis,
			record.LeftPD,
			record.LeftVisualAcuity,
			record.RightSphere,
			record.RightCylinder,
			record.RightAxis,
			record.RightPD,
			record.RightVisualAcuity,
		); err != nil {
			return err
		}
	}

	return nil
}

func (s *customerService) customerExistsTx(ctx context.Context, tx *sql.Tx, customerID int64) (bool, error) {
	var exists int
	err := tx.QueryRowContext(ctx, `SELECT 1 FROM customers WHERE id = ? LIMIT 1`, customerID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func roundTo(value float64, decimalPlaces int) float64 {
	if decimalPlaces < 0 {
		return value
	}

	pow := math.Pow10(decimalPlaces)
	return math.Round(value*pow) / pow
}
