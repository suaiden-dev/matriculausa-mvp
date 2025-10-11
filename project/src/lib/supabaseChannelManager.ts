import { supabase } from './supabase';

class SupabaseChannelManager {
  private channels: Map<string, any> = new Map();
  private subscriptions: Map<string, boolean> = new Map();

  /**
   * Cria ou retorna um canal existente
   */
  getChannel(channelName: string, config?: any) {
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase.channel(channelName, config);
    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Subscribe to a channel if not already subscribed
   */
  subscribe(channelName: string, config?: any) {
    if (this.subscriptions.get(channelName)) {
      console.log(`Channel ${channelName} already subscribed, skipping...`);
      return this.channels.get(channelName);
    }

    const channel = this.getChannel(channelName, config);
    channel.subscribe();
    this.subscriptions.set(channelName, true);
    console.log(`Subscribed to channel: ${channelName}`);
    return channel;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channelName: string) {
    if (!this.subscriptions.get(channelName)) {
      console.log(`Channel ${channelName} not subscribed, skipping unsubscribe...`);
      return;
    }

    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        supabase.removeChannel(channel);
        console.log(`Unsubscribed from channel: ${channelName}`);
      } catch (error) {
        console.warn(`Error unsubscribing from channel ${channelName}:`, error);
      }
    }

    this.channels.delete(channelName);
    this.subscriptions.delete(channelName);
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    for (const [channelName] of this.subscriptions) {
      this.unsubscribe(channelName);
    }
  }

  /**
   * Check if a channel is subscribed
   */
  isSubscribed(channelName: string): boolean {
    return this.subscriptions.get(channelName) || false;
  }

  /**
   * Get all active channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Singleton instance
export const channelManager = new SupabaseChannelManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    channelManager.unsubscribeAll();
  });
}
