import React, { memo } from 'react';
import { Product, CompanySettings, Category } from '../types';

export interface PriceCheckerProps {
  products: Product[];
  settings: CompanySettings;
  categories: Category[];
}

export const PriceChecker = memo(function PriceChecker({ products, settings, categories }: PriceCheckerProps) {
  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-white">Price Checker (Refactoring)</h2>
    </div>
  );
});
