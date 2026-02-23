package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(dbPath string) {
	// 首先初始化时区，必须在任何数据库操作之前完成
	InitLocation()
	log.Println("时区已设置为 Asia/Shanghai (UTC+8)")

	var err error
	DB, err = sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("无法打开数据库: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("无法连接到数据库: %v", err)
	}

	_, err = DB.Exec("PRAGMA journal_mode=WAL;")
	if err != nil {
		log.Fatalf("无法设置WAL模式: %v", err)
	}

	_, err = DB.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		log.Fatalf("无法启用外键约束: %v", err)
	}

	log.Println("数据库连接成功")
}
