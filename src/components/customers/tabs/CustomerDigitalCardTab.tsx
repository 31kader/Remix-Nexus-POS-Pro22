import React from 'react';
import { Customer, CompanySettings } from '../../../types';
import { CustomerDigitalCard } from '../../CustomerDigitalCard';

interface CustomerDigitalCardTabProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
}

export const CustomerDigitalCardTab: React.FC<CustomerDigitalCardTabProps> = ({
  selectedCustomer,
  settings
}) => {
  return (
    <div className="p-2 sm:p-4">
      <CustomerDigitalCard selectedCustomer={selectedCustomer} settings={settings} />
    </div>
  );
};
