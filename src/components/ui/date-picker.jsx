import React from 'react';
import { DatePicker as AntdDatePicker } from 'antd';
import dayjs from 'dayjs';

function toDayjs(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function DatePicker({
  value = '',
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'Select date',
  id,
  name,
}) {
  const selected = toDayjs(value);

  return (
    <div className={`w-full ${className}`.trim()}>
      <AntdDatePicker
        id={id}
        className="w-full muzn-antd-date-picker"
        size="middle"
        format="DD MMM YYYY"
        placeholder={placeholder}
        disabled={disabled}
        value={selected}
        onChange={(date) => onChange?.(date ? date.format('YYYY-MM-DD') : '')}
        allowClear
        inputReadOnly
        style={{ width: '100%' }}
      />
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}
      {required && !name && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          required
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}
    </div>
  );
}
