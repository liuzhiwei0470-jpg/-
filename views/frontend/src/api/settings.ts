import request from './request';

export interface UserSettings {
  autoCleanupEnabled: boolean;
  autoCleanupDays: number;
}

export const settingsApi = {
  // 获取用户设置
  getSettings: async () => {
    return request.get<{
      success: boolean;
      data?: UserSettings;
    }>('/settings');
  },

  // 更新用户设置
  updateSettings: async (settings: Partial<UserSettings>) => {
    return request.put<{
      success: boolean;
      message?: string;
    }>('/settings', settings);
  },
};
