import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Scholarship } from '../types';
import { supabase } from '../lib/supabase';

interface ApplicationStore {
  selectedScholarships: Scholarship[];
  addScholarship: (scholarship: Scholarship) => void;
  removeScholarship: (scholarshipId: string) => void;
  clearScholarships: () => void;
  isSelected: (scholarshipId: string) => boolean;
  getTotalAmount: () => number;
  getSelectedCount: () => number;
}

interface CartItem {
  cart_id: string;
  scholarships: Scholarship;
}

interface CartState {
  cart: CartItem[];
  isLoading: boolean;
  lastFetchUserId: string | null;
  fetchCart: (userId: string) => Promise<void>;
  addToCart: (scholarship: Scholarship, userId: string) => Promise<void>;
  removeFromCart: (scholarshipId: string, userId: string) => Promise<void>;
  clearCart: (userId: string) => Promise<void>;
}

const getCartItemsFromDB = async (userId: string): Promise<CartItem[]> => {
  try {
    const { data, error } = await supabase
      .from('user_cart')
      .select(`
        id, 
        scholarships (
          *,
          universities!inner(id, name, logo_url, location, is_approved)
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching cart:', error);
      return [];
    }

    return data?.map(item => ({
      cart_id: item.id,
      scholarships: item.scholarships as unknown as Scholarship,
    })) || [];
  } catch (error) {
    console.error('Error in getCartItemsFromDB:', error);
    return [];
  }
};

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set, get) => ({
      selectedScholarships: [],
      
      addScholarship: (scholarship) => {
        const { selectedScholarships } = get();
        const isAlreadySelected = selectedScholarships.some(s => s.id === scholarship.id);
        
        if (!isAlreadySelected) {
          set({ selectedScholarships: [...selectedScholarships, scholarship] });
        }
      },
      
      removeScholarship: (scholarshipId) => {
        const { selectedScholarships } = get();
        set({
          selectedScholarships: selectedScholarships.filter(s => s.id !== scholarshipId)
        });
      },
      
      clearScholarships: () => {
        set({ selectedScholarships: [] });
      },
      
      isSelected: (scholarshipId) => {
        const { selectedScholarships } = get();
        return selectedScholarships.some(s => s.id === scholarshipId);
      },
      
      getTotalAmount: () => {
        const { selectedScholarships } = get();
        return selectedScholarships.reduce((total, scholarship) => total + (scholarship.annual_value_with_scholarship ?? 0), 0);
      },

      getSelectedCount: () => {
        const { selectedScholarships } = get();
        return selectedScholarships.length;
      },
    }),
    {
      name: 'application-store',
    }
  )
);

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  isLoading: false,
  lastFetchUserId: null,
  
  fetchCart: async (userId) => {
    const { lastFetchUserId, isLoading } = get();
    
    // Evita fetch desnecessário se já está carregando ou é o mesmo usuário
    if (isLoading || lastFetchUserId === userId) {
      return;
    }

    set({ isLoading: true });
    try {
      const cartItems = await getCartItemsFromDB(userId);
      set({ cart: cartItems, lastFetchUserId: userId });
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  addToCart: async (scholarship, userId) => {
    const { cart } = get();
    if (cart.some(item => item.scholarships.id === scholarship.id)) {
      console.log('Scholarship already in cart:', scholarship.id);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_cart')
        .insert({ user_id: userId, scholarship_id: scholarship.id })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Error adding to cart:', error);
        return;
      }
      
      set((state) => ({ 
        cart: [...state.cart, { cart_id: data.id, scholarships: scholarship }] 
      }));
    } catch (error) {
      console.error('Error in addToCart:', error);
    }
  },
  
  removeFromCart: async (scholarshipId, userId) => {
    try {
      const { error } = await supabase
        .from('user_cart')
        .delete()
        .eq('user_id', userId)
        .eq('scholarship_id', scholarshipId);

      if (error) {
        console.error('Error removing from cart:', error);
        return;
      }

      set((state) => ({ 
        cart: state.cart.filter((item) => item.scholarships.id !== scholarshipId) 
      }));
    } catch (error) {
      console.error('Error in removeFromCart:', error);
    }
  },
  
  clearCart: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_cart')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error clearing cart:', error);
        return;
      }

      set({ cart: [], lastFetchUserId: null });
    } catch (error) {
      console.error('Error in clearCart:', error);
    }
  },
}));