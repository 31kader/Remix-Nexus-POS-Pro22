import { describe, it, expect } from 'vitest';
import { parseAnyAiResponseToProduct } from '../src/components/product/ProductGeminiVisionModal';

describe('parseAnyAiResponseToProduct', () => {
  it('parses structured text from ChatGPT or Gemini', () => {
    const raw = `
Voici l'analyse du produit :
- Nom : Huile d'Olive Vierge 1L
- Marque : Cevital
- Catégorie : Épicerie Salée
- Code-barres : 6131234567890
- Prix estimé : 950 DA
- Description : Huile d'olive pure première pression à froid d'Algérie.
    `;

    const parsed = parseAnyAiResponseToProduct(raw);
    expect(parsed.name).toBe("Huile d'Olive Vierge 1L");
    expect(parsed.brand).toBe("Cevital");
    expect(parsed.category).toBe("Épicerie Salée");
    expect(parsed.barcode).toBe("6131234567890");
    expect(parsed.price).toBe(950);
    expect(parsed.description).toContain("Huile d'olive");
  });

  it('parses JSON format if the AI returned JSON', () => {
    const jsonStr = `
\`\`\`json
{
  "name": "Eau Minérale Goudil 1.5L",
  "brand": "Goudil",
  "category": "Boissons",
  "barcode": "6130001112223",
  "price": 45,
  "description": "Eau minérale naturelle des montagnes."
}
\`\`\`
    `;

    const parsed = parseAnyAiResponseToProduct(jsonStr);
    expect(parsed.name).toBe("Eau Minérale Goudil 1.5L");
    expect(parsed.brand).toBe("Goudil");
    expect(parsed.category).toBe("Boissons");
    expect(parsed.barcode).toBe("6130001112223");
    expect(parsed.price).toBe(45);
  });
});
