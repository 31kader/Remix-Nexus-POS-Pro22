import { describe, it, expect, vi } from 'vitest';

describe('Supplier Payment & Date Formatting Tests', () => {
  function toDatetimeLocal(val?: string): string {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return `${val}T12:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return val.slice(0, 16);
    }
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } catch (_) {}
    return '';
  }

  it('converts date-only format YYYY-MM-DD (e.g. 2026-10-29) to valid datetime-local string with T', () => {
    const formatted = toDatetimeLocal('2026-10-29');
    expect(formatted).toBe('2026-10-29T12:00');
    // Verify it conforms to datetime-local regex required by HTML5 spec
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(formatted)).toBe(true);
  });

  it('preserves ISO string slicing up to minutes', () => {
    const formatted = toDatetimeLocal('2026-10-29T15:45:00.000Z');
    expect(formatted).toBe('2026-10-29T15:45');
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(formatted)).toBe(true);
  });

  it('handles empty or undefined values gracefully', () => {
    expect(toDatetimeLocal('')).toBe('');
    expect(toDatetimeLocal(undefined)).toBe('');
    expect(toDatetimeLocal('invalid-date')).toBe('');
  });
});
