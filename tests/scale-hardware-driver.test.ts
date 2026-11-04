import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseToledoFrame,
  parseDibalCasFrame,
  parseNciFrame,
  parseScaleFrame
} from '../src/services/hardware/scaleFrameParsers';
import {
  getScaleConfig,
  saveScaleConfig,
  DEFAULT_SCALE_CONFIG
} from '../src/services/hardware/scaleConfigStorage';
import { scaleDriver } from '../src/services/hardware/scaleDriverService';

describe('⚖️ Pilote Balance de Comptoir & Décodeurs Séries RS232', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Décodage Trames Mettler Toledo Continuous', () => {
    it('décode correctement un poids stable de 1.250 kg', () => {
      // Trame Toledo standard avec poids 001250 (soit 1.250 kg)
      const frame = '\x02\x20\x00\x00001250000000\r';
      const parsed = parseToledoFrame(frame);
      expect(parsed).not.toBeNull();
      expect(parsed?.weight).toBe(1.25);
      expect(parsed?.unit).toBe('kg');
      expect(parsed?.isStable).toBe(true);
    });

    it('détecte un poids instable si la trame contient un drapeau U ou ?', () => {
      const frame = '\x02\x20\x01\x00002500U00000\r';
      const parsed = parseToledoFrame(frame);
      expect(parsed).not.toBeNull();
      expect(parsed?.isStable).toBe(false);
      expect(parsed?.weight).toBe(2.5);
    });
  });

  describe('2. Décodage Trames Dibal / CAS / Bizerba', () => {
    it('décode une trame stable Dibal "ST,GS,+001.750kg"', () => {
      const frame = 'ST,GS,+001.750kg\r\n';
      const parsed = parseDibalCasFrame(frame);
      expect(parsed).not.toBeNull();
      expect(parsed?.weight).toBe(1.75);
      expect(parsed?.isStable).toBe(true);
      expect(parsed?.isTare).toBe(false);
    });

    it('décode une trame instable "US,GS,+000.450kg"', () => {
      const frame = 'US,GS,+000.450kg\r\n';
      const parsed = parseDibalCasFrame(frame);
      expect(parsed).not.toBeNull();
      expect(parsed?.weight).toBe(0.45);
      expect(parsed?.isStable).toBe(false);
    });

    it('convertit automatiquement les grammes en kilogrammes', () => {
      const frame = 'ST,GS,  850g\r\n';
      const parsed = parseDibalCasFrame(frame);
      expect(parsed).not.toBeNull();
      expect(parsed?.weight).toBe(0.85); // 850g -> 0.850kg
    });

    it('détecte le mode tare lorsque NT ou NET est présent', () => {
      const frame = 'ST,NT,+001.200kg\r\n';
      const parsed = parseDibalCasFrame(frame);
      expect(parsed?.isTare).toBe(true);
    });
  });

  describe('3. Décodage Trame NCI POS Standard', () => {
    it('décode une trame NCI POS "<LF>  2.340kg<CR>"', () => {
      const frame = '\n  2.340kg\r';
      const parsed = parseNciFrame(frame);
      expect(parsed).not.toBeNull();
      expect(parsed?.weight).toBe(2.34);
      expect(parsed?.isStable).toBe(true);
    });
  });

  describe('4. Décodeur Universel & Configuration Balance', () => {
    it('utilise le protocole approprié selon la configuration', () => {
      const toledoRes = parseScaleFrame('\x02001500\r', 'toledo');
      expect(toledoRes?.weight).toBe(1.5);

      const dibalRes = parseScaleFrame('ST,GS,+003.200kg', 'dibal');
      expect(dibalRes?.weight).toBe(3.2);
    });

    it('gère la persistance de configuration dans localStorage', () => {
      const initial = getScaleConfig();
      expect(initial.enabled).toBe(false);
      expect(initial.baudRate).toBe(9600);

      const saved = saveScaleConfig({
        enabled: true,
        protocol: 'dibal',
        baudRate: 4800,
        autoInjectWeight: true
      });

      expect(saved.enabled).toBe(true);
      expect(saved.protocol).toBe('dibal');
      expect(saved.baudRate).toBe(4800);

      const reloaded = getScaleConfig();
      expect(reloaded.enabled).toBe(true);
      expect(reloaded.protocol).toBe('dibal');
      expect(reloaded.baudRate).toBe(4800);
    });

    it('permet la souscription aux changements de poids de scaleDriver', () => {
      let receivedWeight = 0;
      const unsub = scaleDriver.subscribe((w) => {
        receivedWeight = w.weight;
      });

      expect(typeof unsub).toBe('function');
      unsub();
    });
  });
});
