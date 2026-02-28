package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"optics-manager/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateCustomerRequest struct {
	Name          string                      `json:"name"  binding:"required"`
	Phone         string                      `json:"phone" binding:"required"`
	Notes         *string                     `json:"notes"`
	VisionRecords []CustomerVisionRecordInput `json:"vision_records"`
}

type UpdateCustomerRequest struct {
	Name          string                      `json:"name"  binding:"required"`
	Phone         string                      `json:"phone" binding:"required"`
	Notes         *string                     `json:"notes"`
	VisionRecords []CustomerVisionRecordInput `json:"vision_records"`
}

type AppendCustomerVisionRecordsRequest struct {
	VisionRecords []CustomerVisionRecordInput `json:"vision_records" binding:"required,min=1"`
}

type CustomerVisionRecordInput struct {
	RecordedAt        *string `json:"recorded_at"`
	LeftSphere        float64 `json:"left_sphere"`
	LeftCylinder      float64 `json:"left_cylinder"`
	LeftAxis          int     `json:"left_axis"`
	LeftPD            float64 `json:"left_pd"`
	LeftVisualAcuity  float64 `json:"left_visual_acuity"`
	RightSphere       float64 `json:"right_sphere"`
	RightCylinder     float64 `json:"right_cylinder"`
	RightAxis         int     `json:"right_axis"`
	RightPD           float64 `json:"right_pd"`
	RightVisualAcuity float64 `json:"right_visual_acuity"`
}

func (h *Handler) CreateCustomer(c *gin.Context) {
	deps, ok := h.getDeps(c)
	if !ok {
		return
	}

	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	visionRecords, err := mapCustomerVisionRecordInputs(req.VisionRecords)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	newID, err := deps.CustomerService.CreateCustomer(c.Request.Context(), services.CustomerCreateInput{
		Name:          req.Name,
		Phone:         req.Phone,
		Notes:         req.Notes,
		VisionRecords: visionRecords,
	})
	if err != nil {
		if errors.Is(err, services.ErrInvalidVisionRecord) {
			errorResponse(c, http.StatusBadRequest, "验光参数格式不正确: "+err.Error())
			return
		}
		errorResponse(c, http.StatusInternalServerError, "新增客户失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"id": newID, "message": "客户创建成功"})
}

func (h *Handler) GetCustomers(c *gin.Context) {
	deps, ok := h.getDeps(c)
	if !ok {
		return
	}

	customers, err := deps.CustomerService.GetCustomers(c.Request.Context(), c.Query("phone"))
	if err != nil {
		errorResponse(c, http.StatusInternalServerError, "查询客户列表失败: "+err.Error())
		return
	}

	successResponse(c, customers)
}

func (h *Handler) GetCustomerByID(c *gin.Context) {
	deps, ok := h.getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	customer, err := deps.CustomerService.GetCustomerByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrCustomerNotFound) {
			errorResponse(c, http.StatusNotFound, "客户不存在")
			return
		}
		errorResponse(c, http.StatusInternalServerError, "查询客户失败: "+err.Error())
		return
	}

	successResponse(c, customer)
}

func (h *Handler) UpdateCustomer(c *gin.Context) {
	deps, ok := h.getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	visionRecords, err := mapCustomerVisionRecordInputs(req.VisionRecords)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = deps.CustomerService.UpdateCustomer(c.Request.Context(), id, services.CustomerUpdateInput{
		Name:          req.Name,
		Phone:         req.Phone,
		Notes:         req.Notes,
		VisionRecords: visionRecords,
	})
	if err != nil {
		if errors.Is(err, services.ErrCustomerNotFound) {
			errorResponse(c, http.StatusNotFound, "客户不存在")
			return
		}
		if errors.Is(err, services.ErrInvalidVisionRecord) {
			errorResponse(c, http.StatusBadRequest, "验光参数格式不正确: "+err.Error())
			return
		}
		errorResponse(c, http.StatusInternalServerError, "更新客户信息失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"message": "客户信息更新成功"})
}

func (h *Handler) AppendCustomerVisionRecords(c *gin.Context) {
	deps, ok := h.getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	var req AppendCustomerVisionRecordsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errorResponse(c, http.StatusBadRequest, "请求数据格式错误: "+err.Error())
		return
	}

	visionRecords, err := mapCustomerVisionRecordInputs(req.VisionRecords)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = deps.CustomerService.AppendCustomerVisionRecords(c.Request.Context(), id, visionRecords)
	if err != nil {
		if errors.Is(err, services.ErrCustomerNotFound) {
			errorResponse(c, http.StatusNotFound, "客户不存在")
			return
		}
		if errors.Is(err, services.ErrInvalidVisionRecord) {
			errorResponse(c, http.StatusBadRequest, "验光参数格式不正确: "+err.Error())
			return
		}
		errorResponse(c, http.StatusInternalServerError, "追加客户验光参数失败: "+err.Error())
		return
	}

	successResponse(c, gin.H{"message": "客户验光参数追加成功"})
}

func (h *Handler) DeleteCustomer(c *gin.Context) {
	deps, ok := h.getDeps(c)
	if !ok {
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		errorResponse(c, http.StatusBadRequest, "无效的客户ID")
		return
	}

	err = deps.CustomerService.DeleteCustomer(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrCustomerNotFound):
			errorResponse(c, http.StatusNotFound, "客户不存在")
		default:
			errorResponse(c, http.StatusInternalServerError, "删除客户失败: "+err.Error())
		}
		return
	}

	successResponse(c, gin.H{"message": "客户删除成功"})
}

func mapCustomerVisionRecordInputs(records []CustomerVisionRecordInput) ([]services.CustomerVisionRecordInput, error) {
	out := make([]services.CustomerVisionRecordInput, 0, len(records))
	for i, record := range records {
		var parsedRecordedAt *time.Time
		if record.RecordedAt != nil && strings.TrimSpace(*record.RecordedAt) != "" {
			parsedTime, err := parseRecordedAt(strings.TrimSpace(*record.RecordedAt))
			if err != nil {
				return nil, fmt.Errorf("第 %d 组验光参数的 recorded_at 无效: %w", i+1, err)
			}
			parsedRecordedAt = &parsedTime
		}

		out = append(out, services.CustomerVisionRecordInput{
			RecordedAt:        parsedRecordedAt,
			LeftSphere:        record.LeftSphere,
			LeftCylinder:      record.LeftCylinder,
			LeftAxis:          record.LeftAxis,
			LeftPD:            record.LeftPD,
			LeftVisualAcuity:  record.LeftVisualAcuity,
			RightSphere:       record.RightSphere,
			RightCylinder:     record.RightCylinder,
			RightAxis:         record.RightAxis,
			RightPD:           record.RightPD,
			RightVisualAcuity: record.RightVisualAcuity,
		})
	}
	return out, nil
}

func parseRecordedAt(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		if layout == time.RFC3339 {
			if t, err := time.Parse(layout, value); err == nil {
				return t.In(time.Local), nil
			}
			continue
		}

		if t, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("不支持的时间格式: %s", value)
}
