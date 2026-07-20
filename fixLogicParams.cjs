const fs = require('fs');

let logic = fs.readFileSync('src/components/checkout/useCheckoutLogic.ts', 'utf8');

// The errors in useCheckoutLogic are import paths and undefined variables.
// Let's fix import paths.
logic = logic.replace(/'\.\.\//g, "'../../").replace(/'\.\//g, "'../");

// Remove the undefined variables from the return block.
const toRemove = [
  'totalBeforeDiscount', 'wholesaleDiscount', 'retailDiscount', 'promoDiscount', 
  'pointDiscount', 'totalDiscount', 'taxAmount', 'totalAmountString', 
  'loyaltyPointsEarned', 'finalAmount', 'totalCost', 'finalSubtotal', 
  'searchResults', 'toggleRole', 'findProductBySearch', 'quickAddProduct', 
  'updateQuantity', 'handleClearSessionCart', 'getTotalQuantity', 'handleSearchKeyDown'
];

for (const v of toRemove) {
  const regex = new RegExp(v + '\\s*,', 'g');
  logic = logic.replace(regex, '');
  const endRegex = new RegExp(v + '\\s*$', 'g'); // If it's the last variable
  logic = logic.replace(endRegex, '');
}

fs.writeFileSync('src/components/checkout/useCheckoutLogic.ts', logic, 'utf8');
