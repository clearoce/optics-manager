package database

import (
	"fmt"
	"log"
	"time"
	_ "time/tzdata" // 自动将时区数据打包进二进制文件
)

var Loc *time.Location

func InitLocation() {
	var err error
	Loc, err = time.LoadLocation("Asia/Shanghai")
	if err != nil {
		log.Fatalf("无法加载时区 Asia/Shanghai: %v", err)
	}
	time.Local = Loc
}

// sqliteTimeFormats 列举了 SQLite 驱动可能返回的所有时间字符串格式。
// 根据调试发现，modernc.org/sqlite 实际上会把存储的时间字符串转换成
// "2006-01-02T15:04:05Z" 这种带 Z 后缀的格式再返回给 Go。
// 这里的关键是：我们用 time.ParseInLocation 来解析，而不是 time.Parse。
// ParseInLocation 会把格式字符串里的 "Z" 当作一个普通的字面字符来匹配，
// 用来"消耗掉"输入里的那个 Z，但时区仍然由我们传入的 Loc（Asia/Shanghai）决定。
// 这样就实现了"我认识你这个格式，但我不接受你说这是 UTC"的效果。
var sqliteTimeFormats = []string{
	"2006-01-02T15:04:05Z",     // 驱动实际返回的格式（带 Z 后缀）
	"2006-01-02T15:04:05",      // 不带时区后缀的 ISO 8601
	"2006-01-02 15:04:05",      // 空格分隔的标准格式
	"2006-01-02T15:04:05.999Z", // 带毫秒和 Z 后缀
	"2006-01-02T15:04:05.999",  // 带毫秒，不带后缀
	"2006-01-02 15:04:05.999",  // 带毫秒，空格分隔
}

// ParseTime 把 SQLite 驱动返回的时间字符串解析成 time.Time。
// 它会依次尝试所有已知格式，找到第一个能成功解析的就立即返回。
// 无论驱动在字符串末尾是否附加了 Z，解析结果都会携带 Asia/Shanghai 时区信息，
// 确保最终序列化成 JSON 时输出的是 "+08:00" 而不是 "Z"。
func ParseTime(s string) (time.Time, error) {
	for _, format := range sqliteTimeFormats {
		if t, err := time.ParseInLocation(format, s, Loc); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析时间字符串 %q，已尝试所有已知格式", s)
}
