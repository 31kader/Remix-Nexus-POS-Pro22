import React from 'react';

export const formatDisplayDate = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const cleanDate = isoDate.split('T')[0].split(' ')[0].trim();
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${d} ${m} ${y.slice(-2)}`;
    }
    return '';
  } catch (e) {
    return '';
  }
};

export const parseDisplayDate = (display: string): string => {
  if (!display) return '';
  const numbers = display.replace(/\D/g, '');
  if (numbers.length < 6) return '';
  
  const day = numbers.substring(0, 2);
  const month = numbers.substring(2, 4);
  const year = numbers.substring(4, 6);
  
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return '';
  }
  
  const fullYear = `20${year}`;
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const handleDisplayDateChangeHelper = (
  e: React.ChangeEvent<HTMLInputElement>,
  setDisplayExpDate: (val: string) => void,
  setFormData: React.Dispatch<React.SetStateAction<any>>
) => {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 6) val = val.substring(0, 6);
  
  let formatted = '';
  if (val.length > 0) formatted += val.substring(0, 2);
  if (val.length > 2) formatted += ' ' + val.substring(2, 4);
  if (val.length > 4) formatted += ' ' + val.substring(4, 6);
  
  setDisplayExpDate(formatted);
  if (val.length === 6) {
    const iso = parseDisplayDate(formatted);
    setFormData((prev: any) => ({ ...prev, expirationDate: iso }));
  } else {
    setFormData((prev: any) => ({ ...prev, expirationDate: '' }));
  }
};
