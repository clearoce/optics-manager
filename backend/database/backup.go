package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// StartAutoBackup 开启自动备份，每 4 小时执行一次
func StartAutoBackup() {
	// 创建备份目录（如果不存在）
	backupDir := "backups"
	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		_ = os.Mkdir(backupDir, 0755)
	}

	ticker := time.NewTicker(4 * time.Hour)
	go func() {
		// 启动时延迟 10 秒进行首次备份，避免干扰系统启动
		time.Sleep(10 * time.Second)
		performBackup(backupDir)

		for range ticker.C {
			performBackup(backupDir)
		}
	}()
}

func performBackup(backupDir string) {
	// 使用 SQLite 的 VACUUM INTO 命令进行安全在线备份
	// 这种方式能保证备份文件的一致性，即使数据库正在被写入
	timestamp := time.Now().Format("20060102_150405")
	backupPath := filepath.Join(backupDir, fmt.Sprintf("optics_backup_%s.db", timestamp))

	// VACUUM INTO 是 SQLite 3.27.0+ 引入的特性
	query := fmt.Sprintf("VACUUM INTO '%s'", backupPath)
	_, err := DB.Exec(query)
	if err != nil {
		log.Printf("[备份失败] 无法创建数据库备份: %v", err)
		return
	}

	log.Printf("[系统通知] 数据库已成功安全备份至: %s", backupPath)

	// 清理旧备份：只保留最近的 20 个备份文件
	cleanOldBackups(backupDir, 20)
}

func cleanOldBackups(dir string, keep int) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	if len(files) <= keep {
		return
	}

	// 简单按名称排序（因为名称包含时间戳）
	// ReadDir 返回的结果通常已经按名称排序了
	for i := 0; i < len(files)-keep; i++ {
		path := filepath.Join(dir, files[i].Name())
		_ = os.Remove(path)
		log.Printf("[系统通知] 已清理旧备份文件: %s", files[i].Name())
	}
}
