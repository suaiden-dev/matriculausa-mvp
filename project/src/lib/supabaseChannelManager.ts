import { supabase } from "./supabase";

class SupabaseChannelManager {
  private channels: Map<string, any> = new Map();
  private referenceCounts: Map<string, number> = new Map();

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
   * Subscribe to a channel with reference counting
   * @param setup Optional callback to configure the channel (e.g., add .on() listeners) before subscribing
   */
  subscribe(channelName: string, config?: any, setup?: (channel: any) => void) {
    const count = this.referenceCounts.get(channelName) || 0;
    this.referenceCounts.set(channelName, count + 1);

    const channel = this.getChannel(channelName, config);

    if (count === 0) {
      if (setup) {
        setup(channel);
      }
      
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`[ChannelManager] ✅ Subscribed to ${channelName}`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // console.warn(`[ChannelManager] ⚠️ Subscription ${status} for ${channelName}`);
        }
      });
    } else {
      // If already subscribed and setup is provided, it might be a bug in the caller 
      // because Supabase doesn't allow adding listeners after subscribe.
      if (setup) {
        // console.warn(`[ChannelManager] Warning: setup callback provided for already subscribed channel ${channelName}. Listeners might not be added.`);
      }
    }
    
    return channel;
  }

  /**
   * Unsubscribe from a channel with reference counting
   */
  unsubscribe(channelName: string) {
    const count = this.referenceCounts.get(channelName) || 0;

    if (count <= 0) {
      return;
    }

    if (count > 1) {
      this.referenceCounts.set(channelName, count - 1);
      // console.log(`[ChannelManager] Channel ${channelName} still has ${count - 1} subscribers, holding...`);
      return;
    }

    // Ultima inscrição sendo removida
    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        supabase.removeChannel(channel);
        // console.log(`[ChannelManager] ℹ️ Channel removed: ${channelName}`);
      } catch (error) {
        // console.warn(`[ChannelManager] ❌ Error removing channel ${channelName}:`, error);
      }
    }

    this.channels.delete(channelName);
    this.referenceCounts.delete(channelName);
  }


  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    for (const [channelName] of this.referenceCounts) {
      this.unsubscribe(channelName);
    }
  }

  /**
   * Check if a channel is subscribed
   */
  isSubscribed(channelName: string): boolean {
    return (this.referenceCounts.get(channelName) || 0) > 0;
  }

  /**
   * Get all active channel names
   */
  getActiveChannels(): string[] {
    return Array.from(this.referenceCounts.keys());
  }
}

// Singleton instance
export const channelManager = new SupabaseChannelManager();

// Cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    channelManager.unsubscribeAll();
  });
}
