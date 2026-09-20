import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealtimeCircuitBreaker } from '../src/services/RealtimeCircuitBreaker';

describe('RealtimeCircuitBreaker Suite', () => {
  let breaker: RealtimeCircuitBreaker;
  let disconnectMock: any;
  let connectMock: any;

  beforeEach(() => {
    breaker = new RealtimeCircuitBreaker();
    disconnectMock = vi.fn();
    connectMock = vi.fn();
    breaker.registerSocketHandlers(disconnectMock, connectMock);
  });

  it('1. Initialisation par défaut : le coupe-circuit est fermé (inactif)', () => {
    expect(breaker.isOpen()).toBe(false);
  });

  it('2. Calcule les intervalles de reconnexion progressifs', () => {
    expect(breaker.getReconnectInterval(1)).toBe(1000);
    expect(breaker.getReconnectInterval(2)).toBe(2000);
    expect(breaker.getReconnectInterval(3)).toBe(5000);
  });

  it('3. Déclenche le coupe-circuit après 3 échecs consécutifs', () => {
    let statusReceived: string | null = null;
    const listener = (e: any) => {
      statusReceived = e.detail?.status;
    };
    window.addEventListener('nexus-realtime-status', listener);

    breaker.recordFailure('test_channel_1');
    expect(breaker.isOpen()).toBe(false);
    expect(disconnectMock).not.toHaveBeenCalled();

    breaker.recordFailure('test_channel_2');
    expect(breaker.isOpen()).toBe(false);
    expect(disconnectMock).not.toHaveBeenCalled();

    breaker.recordFailure('test_channel_3');
    expect(breaker.isOpen()).toBe(true);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(statusReceived).toBe('idle');

    window.removeEventListener('nexus-realtime-status', listener);
  });

  it('4. Une fois ouvert, getReconnectInterval temporise à 5 minutes (300000ms)', () => {
    breaker.trip('forced_trip');
    expect(breaker.isOpen()).toBe(true);
    expect(breaker.getReconnectInterval(1)).toBe(300000);
  });

  it('5. reset() réinitialise le coupe-circuit et tente la reconnexion', () => {
    breaker.trip('test');
    expect(breaker.isOpen()).toBe(true);

    let retryEventFired = false;
    let statusEvent: string | null = null;
    const onRetry = () => { retryEventFired = true; };
    const onStatus = (e: any) => { statusEvent = e.detail?.status; };

    window.addEventListener('nexus-realtime-retry', onRetry);
    window.addEventListener('nexus-realtime-status', onStatus);

    breaker.reset('user_sync');

    expect(breaker.isOpen()).toBe(false);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(retryEventFired).toBe(true);
    expect(statusEvent).toBe('reconnecting');

    window.removeEventListener('nexus-realtime-retry', onRetry);
    window.removeEventListener('nexus-realtime-status', onStatus);
  });

  it('6. recordSuccess() réinitialise les échecs et émet le statut connected', () => {
    breaker.recordFailure('fail1');
    breaker.recordFailure('fail2');

    let statusEvent: string | null = null;
    const onStatus = (e: any) => { statusEvent = e.detail?.status; };
    window.addEventListener('nexus-realtime-status', onStatus);

    breaker.recordSuccess();

    expect(breaker.isOpen()).toBe(false);
    expect(statusEvent).toBe('connected');

    window.removeEventListener('nexus-realtime-status', onStatus);
  });
});
