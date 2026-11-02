import { realtimeCircuitBreaker } from '../../services/RealtimeCircuitBreaker';

/**
 * Souscrit en toute sécurité à un canal Supabase Realtime sans jamais déclencher
 * "Uncaught Error: tried to join multiple times. 'join' can only be called a single time per channel instance".
 */
export const safeSubscribeChannel = (
  supabaseClient: any,
  channel: any,
  callback?: (status: string, err?: any) => void
) => {
  if (!supabaseClient || !channel) return channel;
  try {
    if (channel.state === 'joined' || channel.state === 'joining') {
      return channel;
    }
    if (channel.joinedOnce) {
      if (typeof supabaseClient?.realtime?.connect === 'function') {
        try { supabaseClient.realtime.connect(); } catch (_) {}
      }
      if (typeof channel.rejoin === 'function') {
        try { channel.rejoin(); } catch (_) {}
      }
      return channel;
    }
    return channel.subscribe(callback);
  } catch (err: any) {
    if (!String(err?.message || '').includes('tried to join multiple times')) {
      console.warn('[Supabase] Channel subscribe warning:', err);
    }
    return channel;
  }
};

export const disconnectRealtime = async (supabaseClient: any): Promise<void> => {
  if (!supabaseClient || !supabaseClient?.realtime) return;
  try {
    await supabaseClient.realtime.disconnect();
  } catch (_) {}
};

export const reconnectRealtime = (): void => {
  realtimeCircuitBreaker.reset('manual_request');
};

export const removeChannelByName = (supabaseClient: any, channelName: string) => {
  if (!supabaseClient || typeof supabaseClient.getChannels !== 'function') return;
  try {
    const channels = supabaseClient.getChannels();
    const matched = channels.find(
      (c: any) => c.name === channelName || c.topic === `realtime:${channelName}`
    );
    if (matched) {
      supabaseClient.removeChannel(matched).catch(() => {});
    }
  } catch (err) {}
};

export const safeRemoveChannel = (supabaseClient: any, channelOrName: any) => {
  if (!supabaseClient || !channelOrName) return;
  try {
    if (typeof channelOrName === 'string') {
      removeChannelByName(supabaseClient, channelOrName);
    } else {
      if (typeof channelOrName.unsubscribe === 'function') {
        try {
          channelOrName.unsubscribe();
        } catch (_) {}
      }
      if (typeof supabaseClient.removeChannel === 'function') {
        supabaseClient.removeChannel(channelOrName).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[Supabase] Channel cleanup warning:', err);
  }
};
