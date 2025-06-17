import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface SubscriptionData {
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

interface OrderData {
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscription(null);
      setOrders([]);
      setLoading(false);
      return;
    }

    async function fetchSubscriptionData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch subscription data
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (subscriptionError) {
          console.error('Error fetching subscription:', subscriptionError);
          setError('Failed to load subscription data');
        } else {
          setSubscription(subscriptionData);
        }

        // Fetch orders data
        const { data: ordersData, error: ordersError } = await supabase
          .from('stripe_user_orders')
          .select('*')
          .order('order_date', { ascending: false });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          setError((prev) => prev ? `${prev}. Failed to load orders data` : 'Failed to load orders data');
        } else {
          setOrders(ordersData || []);
        }
      } catch (err: any) {
        console.error('Error in subscription hook:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchSubscriptionData();
  }, [user, isAuthenticated]);

  const hasActiveSubscription = subscription?.subscription_status === 'active';
  
  const hasPaidProcess = orders.some(order => 
    order.payment_status === 'paid' && order.order_status === 'completed'
  );

  return {
    subscription,
    orders,
    loading,
    error,
    hasActiveSubscription,
    hasPaidProcess
  };
}