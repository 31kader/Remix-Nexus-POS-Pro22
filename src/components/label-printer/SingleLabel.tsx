import React from 'react';
import Barcode from 'react-barcode';
import { Product } from '../../types';

export interface SingleLabelProps {
  product: Product;
  currency?: string;
}

export const SingleLabel = ({ product, currency }: SingleLabelProps) => {
  return (
    <div
      style={{
        width: '40mm',
        height: '30mm',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#fff',
        padding: '0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#000',
        fontFamily: 'Arial, sans-serif',
        breakAfter: 'page',
        pageBreakAfter: 'always',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        margin: 0
      }}
    >
      <div
        style={{
          width: '30mm',
          height: '40mm',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          WebkitTransform: 'translate(-50%, -50%) rotate(90deg)',
          padding: '2mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%'
          }}
        >
          {product.name}
        </div>

        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: '2mm',
            marginBottom: '2mm'
          }}
        >
          {product.price.toFixed(2)} {currency || 'DA'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
            <Barcode
              value={product.sku || product.id.substring(0, 6).toUpperCase()}
              format="CODE128"
              width={1.2}
              height={30}
              margin={0}
              displayValue={true}
              fontSize={12}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const getCommonStyles = () => `
  @media print {
    @page { 
      size: 40mm 30mm;
      margin: 0;
    }
    html, body { 
      margin: 0 !important; 
      padding: 0 !important; 
      width: 40mm !important;
      height: auto !important;
      overflow: visible !important;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;
