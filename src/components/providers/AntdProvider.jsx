import React from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { useTheme } from '../../context/ThemeContext';

export const AntdProvider = ({ children }) => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider
      theme={{
        // cssVar disabled so antd's <App> can stay wrapper-less (component={false})
        // without emitting the cssVar warning — keeps the custom sidebar colors intact.
        cssVar: false,
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563EB',
          borderRadius: 8,
          fontSize: 12,
          controlHeight: 34,
          colorBgContainer: isDark ? '#0F172A' : '#FFFFFF',
          colorBorder: isDark ? '#334155' : '#E2E8F0',
          colorText: isDark ? '#F1F5F9' : '#0F172A',
          colorTextPlaceholder: isDark ? '#64748B' : '#94A3B8',
        },
        components: {
          DatePicker: {
            cellHeight: 28,
            cellWidth: 32,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};
