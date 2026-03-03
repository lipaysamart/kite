package model

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

const (
	GlobalSidebarConfigKey = "global_sidebar_config"
)

type SystemConfig struct {
	Model
	Key   string `json:"key" gorm:"type:varchar(100);uniqueIndex;not null"`
	Value string `json:"value" gorm:"type:text"`
}

func GetSystemConfig(key string) (*SystemConfig, error) {
	var config SystemConfig
	if err := DB.Where("`key` = ?", key).First(&config).Error; err != nil {
		return nil, err
	}
	return &config, nil
}

func SetSystemConfig(key, value string) error {
	var config SystemConfig
	err := DB.Where("`key` = ?", key).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			config = SystemConfig{Key: key, Value: value}
			return DB.Create(&config).Error
		}
		return err
	}
	config.Value = value
	return DB.Save(&config).Error
}

func GetGlobalSidebarConfig() (string, error) {
	config, err := GetSystemConfig(GlobalSidebarConfigKey)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return config.Value, nil
}

func SetGlobalSidebarConfig(value string) error {
	return SetSystemConfig(GlobalSidebarConfigKey, value)
}

type SystemConfigHistory struct {
	Model
	Key        string    `json:"key" gorm:"type:varchar(100);index"`
	OldValue   string    `json:"old_value" gorm:"type:text"`
	NewValue   string    `json:"new_value" gorm:"type:text"`
	UpdatedBy  string    `json:"updated_by" gorm:"type:varchar(100)"`
	UpdatedAt2 time.Time `json:"updated_at" gorm:"type:timestamp"`
}

func (SystemConfigHistory) TableName() string {
	return "system_config_history"
}
