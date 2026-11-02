import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lanSyncService } from '../src/services/lanSyncService';
import { LanSyncMessage, LanStockAdjustmentPayload, LanCustomerBalancePayload } from '../src/types/lanSync';
import { useCoreStore } from '../src/store/useCoreStore';
import { usePeopleStore } from '../src/store/usePeopleStore';
import { useTransactionStore } from '../src/store/useTransactionStore';
import { setTerminalInfo } from '../src/services/terminalService';
import { enqueueStockAdjustment, enqueueCustomerBalanceAdjustment } from '../src/services/SyncService';

describe('⚡ Option A : Synchronisation Réseau Local LAN Multi-Caisses & Mode Hybride', () => {
  beforeEach(() => {
    localStorage.clear();
    setTerminalInfo('POS-01', 'Caisse Principale');
    lanSyncService.setRole('STANDALONE');
    lanSyncService.setMasterIp('192.168.1.50');
    lanSyncService.setMasterPort(3000);

    // Initialiser les faux produits et clients
    useCoreStore.getState().setProducts([
      {
        id: 'prod-milk',
        name: 'Lait Candia 1L',
        price: 130,
        costPrice: 110,
        stock: 50,
        barcode: '6130001',
        categoryId: 'cat-cremerie'
      } as any,
      {
        id: 'prod-bread',
        name: 'Pain Tradition',
        price: 30,
        costPrice: 20,
        stock: 100,
        barcode: '6130002',
        categoryId: 'cat-boulangerie'
      } as any
    ]);

    usePeopleStore.getState().setCustomers([
      {
        id: 'cust-karim',
        name: 'Karim Bouzid',
        phone: '0550123456',
        balance: 1500,
        loyaltyPoints: 120,
        totalSpent: 45000
      } as any
    ]);

    useTransactionStore.getState().setTransactions([]);
  });

  afterEach(() => {
    lanSyncService.disconnect();
    vi.restoreAllMocks();
  });

  describe('1. Rôles et Configuration Réseau Local', () => {
    it('doit initialiser en mode STANDALONE par défaut sans diffusion superflue', () => {
      lanSyncService.loadConfiguration();
      expect(lanSyncService.getRole()).toBe('STANDALONE');
      const state = lanSyncService.getState();
      expect(state.role).toBe('STANDALONE');
      expect(state.isLanConnected).toBe(false);
    });

    it('doit permettre de configurer le poste en Caisse Maître (Hub LAN)', () => {
      lanSyncService.setRole('MASTER');
      expect(lanSyncService.getRole()).toBe('MASTER');
      expect(localStorage.getItem('nexus_lan_role')).toBe('MASTER');
    });

    it('doit permettre de configurer le poste en Caisse Secondaire avec IP Maître', () => {
      lanSyncService.setRole('SECONDARY');
      lanSyncService.setMasterIp('192.168.1.100');
      lanSyncService.setMasterPort(3000);

      expect(lanSyncService.getRole()).toBe('SECONDARY');
      expect(lanSyncService.getMasterIp()).toBe('192.168.1.100');
      expect(lanSyncService.getMasterPort()).toBe(3000);
      expect(localStorage.getItem('nexus_lan_master_ip')).toBe('192.168.1.100');
    });
  });

  describe('2. Diagnostic du Mode Réseau Hybride (Fallback Automatique)', () => {
    it('doit calculer le mode LAN_AND_CLOUD lorsque le câble et Internet sont connectés', () => {
      // Simuler LAN connecté et Internet actif
      (lanSyncService as any).isLanConnected = true;
      (lanSyncService as any).isInternetConnected = true;
      expect(lanSyncService.getHybridMode()).toBe('LAN_AND_CLOUD');
    });

    it('doit basculer en LAN_ONLY si le câble Ethernet est branché mais pas d\'Internet', () => {
      (lanSyncService as any).isLanConnected = true;
      (lanSyncService as any).isInternetConnected = false;
      expect(lanSyncService.getHybridMode()).toBe('LAN_ONLY');
    });

    it('doit basculer en CLOUD_ONLY si le câble est débranché mais qu\'Internet fonctionne', () => {
      (lanSyncService as any).isLanConnected = false;
      (lanSyncService as any).isInternetConnected = true;
      expect(lanSyncService.getHybridMode()).toBe('CLOUD_ONLY');
    });

    it('doit basculer en OFFLINE_ISOLATED si ni câble ni Internet ne sont disponibles', () => {
      (lanSyncService as any).isLanConnected = false;
      (lanSyncService as any).isInternetConnected = false;
      expect(lanSyncService.getHybridMode()).toBe('OFFLINE_ISOLATED');
    });
  });

  describe('3. Réception d\'Ajustement de Stock en Direct (Ethernet / Wi-Fi sans Internet)', () => {
    it('doit décrémenter le stock local immédiatement lors de la réception d\'une vente d\'un autre poste', () => {
      const initialStock = useCoreStore.getState().products.find(p => p.id === 'prod-milk')?.stock;
      expect(initialStock).toBe(50);

      // Caisse POS-02 vend 2 unités de lait et envoie le message LAN
      const message: LanSyncMessage<LanStockAdjustmentPayload> = {
        id: 'msg_test_stock_01',
        originTerminalId: 'POS-02',
        originTerminalName: 'Caisse Secondaire',
        action: 'STOCK_ADJUSTMENT',
        timestamp: new Date().toISOString(),
        payload: {
          productId: 'prod-milk',
          adjustment: -2,
          delta: -2,
          mode: 'delta',
          reason: 'Vente ticket #TX-888',
          userId: 'usr_cashier_2'
        }
      };

      lanSyncService.handleIncomingMessage(message);

      const updatedStock = useCoreStore.getState().products.find(p => p.id === 'prod-milk')?.stock;
      expect(updatedStock).toBe(48); // 50 - 2 = 48
    });

    it('doit cumuler plusieurs ajustements consécutifs de différentes caisses sans écrasement', () => {
      // Vente 1 depuis POS-02 (-3)
      lanSyncService.handleIncomingMessage({
        id: 'msg_test_multi_1',
        originTerminalId: 'POS-02',
        originTerminalName: 'Caisse 2',
        action: 'STOCK_ADJUSTMENT',
        timestamp: new Date().toISOString(),
        payload: { productId: 'prod-bread', adjustment: -3, delta: -3, mode: 'delta' }
      });

      // Vente 2 depuis POS-03 (-5)
      lanSyncService.handleIncomingMessage({
        id: 'msg_test_multi_2',
        originTerminalId: 'POS-03',
        originTerminalName: 'Caisse 3',
        action: 'STOCK_ADJUSTMENT',
        timestamp: new Date().toISOString(),
        payload: { productId: 'prod-bread', adjustment: -5, delta: -5, mode: 'delta' }
      });

      const updatedStock = useCoreStore.getState().products.find(p => p.id === 'prod-bread')?.stock;
      expect(updatedStock).toBe(92); // 100 - 3 - 5 = 92
    });
  });

  describe('4. Réception d\'une Nouvelle Vente (Transaction)', () => {
    it('doit insérer la vente dans le store des transactions et notifier l\'interface sans doublon', () => {
      const newTransaction = {
        id: 'tx_lan_12345',
        total: 260,
        subtotal: 260,
        tax: 0,
        discount: 0,
        paymentMethod: 'cash',
        amountPaid: 300,
        change: 40,
        terminalId: 'POS-02',
        terminalName: 'Caisse 2',
        items: [
          { id: 'prod-milk', name: 'Lait Candia 1L', price: 130, quantity: 2, total: 260 }
        ],
        timestamp: new Date().toISOString()
      };

      const message: LanSyncMessage = {
        id: 'msg_tx_01',
        originTerminalId: 'POS-02',
        originTerminalName: 'Caisse 2',
        action: 'TRANSACTION_NEW',
        timestamp: new Date().toISOString(),
        payload: newTransaction
      };

      lanSyncService.handleIncomingMessage(message);

      const allTx = useTransactionStore.getState().transactions;
      expect(allTx.length).toBe(1);
      expect(allTx[0].id).toBe('tx_lan_12345');
      expect(allTx[0].terminalId).toBe('POS-02');

      // Tenter de renvoyer le même message (anti-doublon)
      lanSyncService.handleIncomingMessage(message);
      expect(useTransactionStore.getState().transactions.length).toBe(1);
    });
  });

  describe('5. Réception de Mise à Jour Client (Solde & Fidélité)', () => {
    it('doit incrémenter le solde et les points de fidélité du client en temps réel', () => {
      const initialCust = usePeopleStore.getState().customers.find(c => c.id === 'cust-karim');
      expect(initialCust?.balance).toBe(1500);
      expect(initialCust?.loyaltyPoints).toBe(120);

      const message: LanSyncMessage<LanCustomerBalancePayload> = {
        id: 'msg_cust_01',
        originTerminalId: 'POS-02',
        originTerminalName: 'Caisse 2',
        action: 'CUSTOMER_BALANCE_UPDATE',
        timestamp: new Date().toISOString(),
        payload: {
          customerId: 'cust-karim',
          deltaBalance: 500, // dette supplémentaire de 500 DA
          deltaSpent: 1200,
          deltaPoints: 12
        }
      };

      lanSyncService.handleIncomingMessage(message);

      const updatedCust = usePeopleStore.getState().customers.find(c => c.id === 'cust-karim');
      expect(updatedCust?.balance).toBe(2000); // 1500 + 500 = 2000 DA
      expect(updatedCust?.loyaltyPoints).toBe(132); // 120 + 12 = 132 pts
      expect(updatedCust?.totalSpent).toBe(46200); // 45000 + 1200 = 46200 DA
    });
  });

  describe('6. Anti-Bouclage et Résilience Déconnexion Câble LAN', () => {
    it('doit ignorer les messages originaires de ce même poste (anti-boucle réseau)', () => {
      setTerminalInfo('POS-01', 'Caisse Principale');

      const message: LanSyncMessage<LanStockAdjustmentPayload> = {
        id: 'msg_own_terminal',
        originTerminalId: 'POS-01', // Originaire du même terminal
        originTerminalName: 'Caisse Principale',
        action: 'STOCK_ADJUSTMENT',
        timestamp: new Date().toISOString(),
        payload: {
          productId: 'prod-milk',
          adjustment: -10,
          delta: -10
        }
      };

      lanSyncService.handleIncomingMessage(message);

      // Le stock ne doit PAS être décrémenté car le message est un écho de soi-même
      const stock = useCoreStore.getState().products.find(p => p.id === 'prod-milk')?.stock;
      expect(stock).toBe(50);
    });

    it('doit mettre en file d\'attente les actions lors d\'une coupure de câble et les décharger à la reconnexion', () => {
      lanSyncService.setRole('SECONDARY');
      (lanSyncService as any).socket = {
        connected: false,
        emit: vi.fn()
      };

      // Émettre un ajustement alors que le câble est débranché
      lanSyncService.broadcastStockAdjustment('prod-bread', -4);

      const state = lanSyncService.getState();
      expect(state.pendingOutgoingCount).toBe(1);

      // Le câble est rebranché : le socket se reconnecte
      const emitSpy = vi.fn();
      (lanSyncService as any).socket = {
        connected: true,
        emit: emitSpy
      };

      (lanSyncService as any).flushPendingOutgoingQueue();

      expect(emitSpy).toHaveBeenCalledWith('lan:sync', expect.objectContaining({
        action: 'STOCK_ADJUSTMENT',
        payload: expect.objectContaining({ productId: 'prod-bread', adjustment: -4 })
      }));
      expect(lanSyncService.getState().pendingOutgoingCount).toBe(0);
    });
  });

  describe('7. Intégration Transparente avec SyncService (Diffusion Automatique)', () => {
    it('enqueueStockAdjustment doit diffuser automatiquement vers lanSyncService sans impacter le Cloud', () => {
      lanSyncService.setRole('SECONDARY');
      const broadcastSpy = vi.spyOn(lanSyncService, 'broadcastStockAdjustment');

      enqueueStockAdjustment('prod-milk', -3, { reason: 'Vente test' });

      expect(broadcastSpy).toHaveBeenCalledWith('prod-milk', -3, expect.objectContaining({
        reason: 'Vente test'
      }));
    });

    it('enqueueCustomerBalanceAdjustment doit diffuser automatiquement vers lanSyncService', () => {
      lanSyncService.setRole('SECONDARY');
      const broadcastCustSpy = vi.spyOn(lanSyncService, 'broadcastCustomerBalance');

      enqueueCustomerBalanceAdjustment('cust-karim', 200, 500, 5);

      expect(broadcastCustSpy).toHaveBeenCalledWith('cust-karim', 200, 500, 5);
    });
  });

  describe('8. Robustesse Réseau, Nettoyage d\'URL & Cumul Atomique', () => {
    it('nettoie et normalise correctement les adresses IP saisies avec http:// ou port inclus', () => {
      expect(lanSyncService.buildTargetUrl('http://192.168.1.50', 3000)).toBe('http://192.168.1.50:3000');
      expect(lanSyncService.buildTargetUrl('https://192.168.1.50:8080', 3000)).toBe('http://192.168.1.50:8080');
      expect(lanSyncService.buildTargetUrl('10.0.0.12:4000')).toBe('http://10.0.0.12:4000');
    });

    it('inclut le jeton lanToken dans chaque message émis pour validation par le Hub', () => {
      lanSyncService.setRole('SECONDARY');
      lanSyncService.setLanToken('secret-lan-token-99');
      const emitSpy = vi.fn();
      (lanSyncService as any).socket = {
        connected: true,
        emit: emitSpy
      };

      lanSyncService.broadcastStockAdjustment('prod-milk', -2);

      expect(emitSpy).toHaveBeenCalledWith('lan:sync', expect.objectContaining({
        lanToken: 'secret-lan-token-99',
        action: 'STOCK_ADJUSTMENT'
      }));
    });

    it('applique plusieurs ajustements de stock consécutifs de façon atomique', () => {
      // Stock initial prod-milk = 50
      lanSyncService.handleIncomingMessage({
        id: 'msg-consec-1',
        originTerminalId: 'POS-02',
        originTerminalName: 'Caisse 2',
        action: 'STOCK_ADJUSTMENT',
        timestamp: new Date().toISOString(),
        payload: { productId: 'prod-milk', adjustment: -5 }
      });

      lanSyncService.handleIncomingMessage({
        id: 'msg-consec-2',
        originTerminalId: 'POS-02',
        originTerminalName: 'Caisse 2',
        action: 'STOCK_ADJUSTMENT',
        timestamp: new Date().toISOString(),
        payload: { productId: 'prod-milk', adjustment: -3 }
      });

      const prod = useCoreStore.getState().products.find(p => p.id === 'prod-milk');
      expect(prod?.stock).toBe(42); // 50 - 5 - 3 = 42
    });
  });
});
