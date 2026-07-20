import { describe, it, expect } from 'vitest';
import {
  camelToSnakeCase,
  snakeToCamelCase,
  convertKeysToSnake,
  convertKeysToCamel,
  preparePayload,
  isBadUrl,
  TABLE_COLUMNS
} from '../src/lib/db-converters';

describe('db-converters helper functions', () => {
  describe('camelToSnakeCase', () => {
    it('should convert standard camelCase to snake_case', () => {
      expect(camelToSnakeCase('firstName')).toBe('first_name');
      expect(camelToSnakeCase('someCamelCaseString')).toBe('some_camel_case_string');
    });

    it('should preserve activeSessionId', () => {
      expect(camelToSnakeCase('activeSessionId')).toBe('activeSessionId');
    });
  });

  describe('snakeToCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamelCase('first_name')).toBe('firstName');
      expect(snakeToCamelCase('some_snake_case_string')).toBe('someSnakeCaseString');
    });
  });

  describe('convertKeysToSnake', () => {
    it('should recursively convert keys of an object to snake_case', () => {
      const input = {
        firstName: 'John',
        nestedData: {
          birthDate: '1990-01-01',
          contactInfo: {
            phoneNumber: '123456'
          }
        }
      };
      const expected = {
        first_name: 'John',
        nested_data: {
          birth_date: '1990-01-01',
          contact_info: {
            phone_number: '123456'
          }
        }
      };
      expect(convertKeysToSnake(input)).toEqual(expected);
    });

    it('should convert Date instance to ISO string', () => {
      const date = new Date('2026-06-23T10:00:00.000Z');
      expect(convertKeysToSnake(date)).toBe(date.toISOString());
    });

    it('should handle arrays', () => {
      const input = [
        { itemPrice: 10 },
        { itemPrice: 20 }
      ];
      const expected = [
        { item_price: 10 },
        { item_price: 20 }
      ];
      expect(convertKeysToSnake(input)).toEqual(expected);
    });

    it('should handle primitive and null values', () => {
      expect(convertKeysToSnake(null)).toBeNull();
      expect(convertKeysToSnake(undefined)).toBeUndefined();
      expect(convertKeysToSnake(123)).toBe(123);
      expect(convertKeysToSnake('string')).toBe('string');
    });
  });

  describe('isBadUrl', () => {
    it('should identify bad URLs', () => {
      expect(isBadUrl('https://aistudio.google.com/test')).toBe(true);
      expect(isBadUrl('https://eb137f4a-fb23-4b8c-aec9-844aecbc242a.com')).toBe(true);
      expect(isBadUrl('https://example.com/_/upload/file/test')).toBe(true);
      expect(isBadUrl('https://valid.com/image.png')).toBe(false);
      expect(isBadUrl(null)).toBe(false);
    });
  });

  describe('convertKeysToCamel', () => {
    it('should recursively convert keys of an object to camelCase', () => {
      const input = {
        first_name: 'John',
        nested_data: {
          birth_date: '1990-01-01'
        }
      };
      const expected = {
        firstName: 'John',
        nestedData: {
          birthDate: '1990-01-01'
        }
      };
      expect(convertKeysToCamel(input)).toEqual(expected);
    });

    it('should clean bad URLs', () => {
      const input = {
        image_url: 'https://aistudio.google.com/test',
        valid_url: 'https://valid.com/image.png'
      };
      const expected = {
        imageUrl: '',
        validUrl: 'https://valid.com/image.png'
      };
      expect(convertKeysToCamel(input)).toEqual(expected);
    });

    it('should preserve Date objects', () => {
      const date = new Date();
      const input = { created_at: date };
      const output = convertKeysToCamel(input);
      expect(output.createdAt).toBeInstanceOf(Date);
      expect(output.createdAt).toEqual(date);
    });
  });

  describe('preparePayload', () => {
    it('should convert camelCase keys to snake_case and filter allowed columns for products', () => {
      const inputProduct = {
        name: 'Test Product',
        price: '12,50', // tests float parsing
        stock: '10',
        categoryId: 'cat_123',
        extraField: 'should be removed'
      };

      const result = preparePayload('products', 'prod_1', inputProduct);
      
      expect(result.id).toBe('prod_1');
      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(12.5);
      expect(result.stock).toBe(10);
      expect(result.category_id).toBe('cat_123');
      expect(result.extra_field).toBeUndefined(); // removed because not in TABLE_COLUMNS
    });

    it('should set default values for empty fields in products', () => {
      const inputProduct = {
        name: '',
        category_id: null,
        unit: null,
        price: null,
        stock: null
      };

      const result = preparePayload('products', 'prod_2', inputProduct);
      
      expect(result.name).toBe('Sans nom');
      expect(result.category_id).toBe('uncategorized');
      expect(result.unit).toBe('pcs');
      expect(result.price).toBe(0);
      expect(result.stock).toBe(0);
    });

    it('should handle boolean and array parsing', () => {
      const inputProduct = {
        name: 'Product Box',
        isBundle: 'true',
        tags: 'box,gift,heavy',
        imageUrls: ['url1', 'url2']
      };

      const result = preparePayload('products', 'prod_3', inputProduct);
      
      expect(result.is_bundle).toBe(true);
      expect(result.tags).toEqual(['box', 'gift', 'heavy']);
      expect(result.image_urls).toEqual(['url1', 'url2']);
    });

    it('should convert plain password to password_hash and strip plain fields', () => {
      const result = preparePayload('users', 'user_1', {
        email: 'agent@nexus.local',
        password: '1234'
      });

      expect(result.id).toBe('user_1');
      expect(result.password).toBeUndefined();
      expect(result.password_hash).toBeTruthy();
      expect(typeof result.password_hash).toBe('string');
      expect(result.password_hash.startsWith('$2')).toBe(true);
    });

    it('should preserve existing bcrypt hash and strip password fields', () => {
      const existingHash = '$2a$10$abcdefghijk1234567890mnopqrstuvABCDEfghijklmnoPQRSTUV';
      const result = preparePayload('users', 'user_2', {
        email: 'agent2@nexus.local',
        passwordHash: existingHash,
        password: 'should-not-leak'
      });

      expect(result.password).toBeUndefined();
      expect(result.password_hash).toBe(existingHash);
    });
  });
});
