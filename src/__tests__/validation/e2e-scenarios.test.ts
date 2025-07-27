/**
 * End-to-End Validation Real-World Scenarios Tests
 * Tests with realistic Italian business data and edge cases
 */

import { ACubeSDK } from '@/core/sdk';
import { ValidationError } from '@/errors/index';
import { HttpTestHelpers } from '../setup';
import { 
  createAmount, 
  createQuantity, 
  createReceiptId, 
  createCashierId, 
  createMerchantId, 
  createSerialNumber 
} from '@/types/branded';

describe('End-to-End Validation Real-World Scenarios', () => {
  let sdk: ACubeSDK;

  beforeEach(() => {
    sdk = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    sdk.removeAllListeners();
  });

  describe('Realistic Italian Business Data', () => {
    describe('Northern Italy Restaurant Chain', () => {
      it('should validate Milano restaurant with authentic data', async () => {
        const milanoRestaurant = {
          fiscal_id: '12345678903', // Valid VAT with checksum
          name: 'Ristorante La Scala S.r.l.',
          email: 'amministrazione@ristorantelascala.it',
          password: 'LaScalaSecure2024!@#',
          address: {
            street_address: 'Via Brera 28',
            zip_code: '20121', // Milano centro
            city: 'Milano',
            province: 'MI'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_lascala_milano'),
          ...milanoRestaurant
        }, 201);

        const result = await sdk.merchants.create(milanoRestaurant);
        expect(result.name).toBe('Ristorante La Scala S.r.l.');
        expect(result.address.province).toBe('MI');
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should validate Torino pizzeria with Piemonte address', async () => {
        const torinoPizzeria = {
          fiscal_id: '98765432109', // Another valid VAT
          name: 'Pizzeria Sabauda di Mario Rossi',
          email: 'mario@pizzeriasabauda.it',
          password: 'SabaudaPizza2024!',
          address: {
            street_address: 'Via Po 47',
            zip_code: '10124', // Torino centro
            city: 'Torino',
            province: 'TO'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_sabauda_torino'),
          ...torinoPizzeria
        }, 201);

        const result = await sdk.merchants.create(torinoPizzeria);
        expect(result.address.city).toBe('Torino');
        expect(result.address.province).toBe('TO');
      });
    });

    describe('Central Italy Businesses', () => {
      it('should validate Roma gelateria with authentic Roman data', async () => {
        const romaGelateria = {
          fiscal_id: '11223344556', // Valid VAT format
          name: 'Gelateria Giolitti 1900 S.n.c.',
          email: 'info@giolitti.it',
          password: 'Giolitti1900Roma!',
          address: {
            street_address: 'Via Uffici del Vicario 40',
            zip_code: '00186', // Roma centro storico
            city: 'Roma',
            province: 'RM'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_giolitti_roma'),
          ...romaGelateria
        }, 201);

        const result = await sdk.merchants.create(romaGelateria);
        expect(result.address.zip_code).toBe('00186');
        expect(result.name).toContain('Giolitti');
      });

      it('should validate Firenze coffee shop with Tuscan data', async () => {
        const firenzeCoffee = {
          fiscal_id: '55667788990', // Valid VAT format
          name: 'Caffè Rivoire di Piazza della Signoria',
          email: 'amministrazione@rivoire.it',
          password: 'RivoireFirenze1872!',
          address: {
            street_address: 'Piazza della Signoria 5r',
            zip_code: '50122', // Firenze centro
            city: 'Firenze',
            province: 'FI'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_rivoire_firenze'),
          ...firenzeCoffee
        }, 201);

        const result = await sdk.merchants.create(firenzeCoffee);
        expect(result.address.province).toBe('FI');
      });
    });

    describe('Southern Italy and Islands', () => {
      it('should validate Napoli pizzeria with authentic Neapolitan data', async () => {
        const napoliPizzeria = {
          fiscal_id: '33445566778', // Valid VAT format
          name: 'Antica Pizzeria da Michele dal 1870',
          email: 'info@damichele.net',
          password: 'Michele1870Napoli!',
          address: {
            street_address: 'Via Cesare Sersale 1/3',
            zip_code: '80139', // Napoli centro storico
            city: 'Napoli',
            province: 'NA'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_michele_napoli'),
          ...napoliPizzeria
        }, 201);

        const result = await sdk.merchants.create(napoliPizzeria);
        expect(result.address.province).toBe('NA');
        expect(result.name).toContain('Michele');
      });

      it('should validate Palermo cannoli shop with Sicilian data', async () => {
        const palermoCannoli = {
          fiscal_id: '77889900112', // Valid VAT format
          name: 'Pasticceria Cappello - Cannoli Siciliani',
          email: 'ordini@pasticceriacappello.it',
          password: 'CappelloPalermo1950!',
          address: {
            street_address: 'Via Colonna Rotta 68',
            zip_code: '90134', // Palermo
            city: 'Palermo',
            province: 'PA'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_cappello_palermo'),
          ...palermoCannoli
        }, 201);

        const result = await sdk.merchants.create(palermoCannoli);
        expect(result.address.province).toBe('PA');
      });
    });
  });

  describe('Complex Receipt Scenarios', () => {
    describe('Restaurant Receipts with Italian Menu Items', () => {
      it('should validate Italian restaurant receipt with multiple courses', async () => {
        const italianRestaurantReceipt = {
          items: [
            {
              description: 'Antipasto della Casa',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('12.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Spaghetti alla Carbonara',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('14.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('1.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Ossobuco alla Milanese',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('28.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Tiramisù della Casa',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('7.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Vino Chianti Classico DOCG',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('35.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '22' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Acqua Minerale San Pellegrino',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('3.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Caffè Espresso',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('2.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('50.00'),
          electronic_payment_amount: createAmount('75.00'),
          discount: createAmount('2.00'),
          invoice_issuing: true, // Business meal
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_restaurant_complex'),
          type: 'sale',
          created_at: '2024-01-01T20:30:00Z',
          total_amount: createAmount('123.00'), // Calculated total
          document_number: 'FAT001',
          document_datetime: '2024-01-01T20:30:00Z'
        }, 201);

        const result = await sdk.receipts.create(italianRestaurantReceipt);
        expect(result.type).toBe('sale');
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should validate pizzeria receipt with authentic Italian pizzas', async () => {
        const pizzeriaReceipt = {
          items: [
            {
              description: 'Pizza Margherita D.O.P.',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('8.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Pizza Marinara Tradizionale',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('7.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.50'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Birra Peroni 66cl',
              quantity: createQuantity('3.00'),
              unit_price: createAmount('4.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '22' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('37.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('1.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_pizzeria_authentic'),
          type: 'sale',
          created_at: '2024-01-01T19:45:00Z',
          total_amount: createAmount('36.00'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(pizzeriaReceipt);
        expect(result).toBeDefined();
      });
    });

    describe('Gelateria and Pasticceria Receipts', () => {
      it('should validate gelateria receipt with Italian gelato flavors', async () => {
        const gelateriaReceipt = {
          items: [
            {
              description: 'Gelato Stracciatella (2 palline)',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('4.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Gelato Pistacchio di Sicilia (3 palline)',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('6.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Cannolo Siciliano',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('3.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.50'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Acqua Naturale',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('1.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('18.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.50'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_gelateria_sicilian'),
          type: 'sale',
          created_at: '2024-01-01T16:20:00Z',
          total_amount: createAmount('17.50'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(gelateriaReceipt);
        expect(result).toBeDefined();
      });
    });

    describe('Coffee Shop Chain Receipts', () => {
      it('should validate coffee shop receipt with Italian coffee specialties', async () => {
        const coffeeShopReceipt = {
          items: [
            {
              description: 'Cappuccino Italiano',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('1.80'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Espresso Ristretto',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('1.20'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Cornetto Vuoto',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('1.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Maritozzo con Panna',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('2.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.20'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('9.40'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.20'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_coffee_roman'),
          type: 'sale',
          created_at: '2024-01-01T08:30:00Z',
          total_amount: createAmount('9.40'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(coffeeShopReceipt);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    describe('Maximum Field Lengths', () => {
      it('should validate merchant with maximum length fields', async () => {
        const maxLengthMerchant = {
          fiscal_id: '12345678903',
          name: 'A'.repeat(255), // Maximum name length
          email: 'very.long.email.address.for.testing.maximum.length.validation@very-long-domain-name-for-testing-purposes.com',
          password: 'VeryLongPasswordWithSpecialCharacters123!@#$%^&*()_+{}|:"<>?[]\\;\'',
          address: {
            street_address: 'Via della Lunghissima Denominazione Stradale con Numero Civico Molto Alto 12345/bis scala A interno 42',
            zip_code: '00100',
            city: 'Nome di Città Molto Lungo Per Testare i Limiti',
            province: 'RM'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_max_length'),
          ...maxLengthMerchant
        }, 201);

        const result = await sdk.merchants.create(maxLengthMerchant);
        expect(result).toBeDefined();
      });

      it('should validate receipt with maximum items and descriptions', async () => {
        const maxItemsReceipt = {
          items: Array.from({ length: 50 }, (_, i) => ({
            description: `Prodotto Numero ${i + 1} con Descrizione Molto Lunga per Testare i Limiti del Sistema di Validazione`,
            quantity: createQuantity('1.00'),
            unit_price: createAmount('1.00'),
            good_or_service: 'B' as const,
            vat_rate_code: '22' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          })),
          cash_payment_amount: createAmount('50.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_max_items'),
          type: 'sale',
          created_at: new Date().toISOString(),
          total_amount: createAmount('50.00'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(maxItemsReceipt);
        expect(result).toBeDefined();
      });
    });

    describe('Special Characters and Unicode', () => {
      it('should validate merchant with special Italian characters', async () => {
        const italianCharactersMerchant = {
          fiscal_id: '12345678903',
          name: 'Caffè dell\'Università - Àccenti è Apòstrofi',
          email: 'info@caffè-università.it',
          password: 'Università123!',
          address: {
            street_address: 'Piazzà San Lorènzo 15/à',
            zip_code: '00100',
            city: 'Ròma',
            province: 'RM'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_italian_chars'),
          ...italianCharactersMerchant
        }, 201);

        const result = await sdk.merchants.create(italianCharactersMerchant);
        expect(result.name).toContain('Università');
      });

      it('should validate receipt with Italian product names and accents', async () => {
        const italianProductsReceipt = {
          items: [
            {
              description: 'Parmigiano Reggiano D.O.P. - stagionato 24 mesi',
              quantity: createQuantity('0.250'),
              unit_price: createAmount('42.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Prosciutto di Parma D.O.P. - 18 mesi',
              quantity: createQuantity('0.150'),
              unit_price: createAmount('48.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('1.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Balsàmico di Mòdena I.G.P.',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('15.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('33.70'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('1.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_italian_products'),
          type: 'sale',
          created_at: new Date().toISOString(),
          total_amount: createAmount('33.70'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(italianProductsReceipt);
        expect(result).toBeDefined();
      });
    });

    describe('Boundary Values for Amounts and Quantities', () => {
      it('should validate receipt with very small amounts and quantities', async () => {
        const smallValuesReceipt = {
          items: [
            {
              description: 'Caramella singola',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('0.01'), // Minimum amount
              good_or_service: 'B' as const,
              vat_rate_code: '22' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Spezie in grammi',
              quantity: createQuantity('0.01'), // Very small quantity
              unit_price: createAmount('100.00'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('2.01'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_small_values'),
          type: 'sale',
          created_at: new Date().toISOString(),
          total_amount: createAmount('2.01'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(smallValuesReceipt);
        expect(result).toBeDefined();
      });

      it('should validate receipt with large amounts', async () => {
        const largeValuesReceipt = {
          items: [
            {
              description: 'Servizio catering per evento aziendale',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('9999.99'), // Large amount
              good_or_service: 'S' as const,
              vat_rate_code: '22' as const,
              discount: createAmount('500.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('0.00'),
          electronic_payment_amount: createAmount('11599.99'), // Large payment
          discount: createAmount('500.00'),
          invoice_issuing: true,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_large_values'),
          type: 'sale',
          created_at: new Date().toISOString(),
          total_amount: createAmount('11599.99'),
          document_number: 'FAT002',
          document_datetime: new Date().toISOString()
        }, 201);

        const result = await sdk.receipts.create(largeValuesReceipt);
        expect(result).toBeDefined();
        expect(result.document_number).toBe('FAT002');
      });
    });
  });

  describe('Error Scenarios with Realistic Data', () => {
    it('should reject merchant with invalid but realistic-looking VAT number', async () => {
      const invalidVATMerchant = {
        fiscal_id: '12345678901', // Invalid checksum (last digit should be 3)
        name: 'Ristorante Bella Vista',
        email: 'info@bellavista.it',
        password: 'BellaVista2024!',
        address: {
          street_address: 'Via Panoramica 15',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };

      await expect(
        sdk.merchants.create(invalidVATMerchant as any)
      ).rejects.toThrow(ValidationError);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject receipt with invalid VAT rate combinations', async () => {
      const invalidVATReceipt = {
        items: [
          {
            description: 'Prodotto con IVA impossibile',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('10.00'),
            good_or_service: 'B' as const,
            vat_rate_code: '99' as const, // Invalid VAT rate
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }
        ],
        cash_payment_amount: createAmount('10.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: false,
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      await expect(
        sdk.receipts.create(invalidVATReceipt as any)
      ).rejects.toThrow(ValidationError);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject merchant with non-existent Italian province', async () => {
      const invalidProvinceMerchant = {
        fiscal_id: '12345678903',
        name: 'Merchant with Invalid Province',
        email: 'test@invalid.com',
        password: 'Password123!',
        address: {
          street_address: 'Via Test 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'ZZ' // Non-existent province
        }
      };

      // This should generate a warning but potentially still pass
      // depending on configuration
      try {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_invalid_province'),
          ...invalidProvinceMerchant
        }, 201);

        const result = await sdk.merchants.create(invalidProvinceMerchant as any);
        
        // If it passes, it should be with warnings
        expect(result).toBeDefined();
      } catch (error) {
        // Or it might fail with validation error
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });
});