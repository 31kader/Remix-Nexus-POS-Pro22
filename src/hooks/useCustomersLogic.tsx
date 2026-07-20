// Re-export depuis /components pour cohérence de l'organisation.
// Ce fichier permet d'importer depuis src/hooks/ sans casser les composants existants.
export { useCustomersLogic } from '../components/useCustomersLogic';
export type { CustomersProps } from '../components/useCustomersLogic';
