import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Scholarship } from '../types';
import { supabase } from '../lib/supabase';
import NotificationService from '../services/NotificationService';

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
  syncCartWithDatabase: (userId: string) => Promise<void>;
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

// Função para verificar se uma bolsa ainda está disponível no cart
const validateCartItemAvailability = async (userId: string, scholarshipId: string): Promise<boolean> => {
  try {
    console.log('validateCartItemAvailability: Checking availability for user:', userId, 'scholarship:', scholarshipId);
    
    const { data, error } = await supabase
      .from('user_cart')
      .select('id')
      .eq('user_id', userId)
      .eq('scholarship_id', scholarshipId)
      .single();

    if (error) {
      console.log('validateCartItemAvailability: Error checking availability:', error.message);
      return false;
    }
    
    const isAvailable = !!data;
    console.log('validateCartItemAvailability: Result for scholarship', scholarshipId, ':', isAvailable);
    return isAvailable;
  } catch (error) {
    console.log('validateCartItemAvailability: Exception checking availability:', error);
    return false;
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
    const { isLoading } = get();
    
    // Evita fetch desnecessário se já está carregando
    if (isLoading) {
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

      // Enviar notificação para a universidade
      try {
        // Buscar dados do aluno
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', userId)
          .single();

        if (userError || !userProfile) {
          console.error('Error fetching user profile for notification:', userError);
          return;
        }

        // Buscar dados da universidade
        const universityId = scholarship.universities?.id || scholarship.university_id;
        if (!universityId) {
          console.error('University ID not found for notification');
          return;
        }

        const { data: university, error: univError } = await supabase
          .from('universities')
          .select('id, name, contact')
          .eq('id', universityId)
          .single();

        if (univError || !university) {
          console.error('Error fetching university for notification:', univError);
          return;
        }

        const contact = university.contact || {};
        const universityEmail = contact.admissionsEmail || contact.email || '';

        if (!universityEmail) {
          console.error('University email not found for notification');
          return;
        }

        // Criar e enviar notificação
        const payload = NotificationService.createUniversityConfirmationPayload(
          userProfile.full_name || 'Aluno',
          userProfile.email || '',
          university.name,
          universityEmail,
          scholarship.title
        );

        const result = await NotificationService.sendUniversityNotification(payload);
        
        if (result.success) {
          console.log('University notification sent successfully');
        } else {
          console.error('Failed to send university notification:', result.error);
        }
      } catch (notificationError) {
        console.error('Error sending university notification:', notificationError);
        // Não falhar a operação principal por causa da notificação
      }
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

  syncCartWithDatabase: async (userId: string) => {
    const { cart, isLoading } = get();
    
    if (isLoading) {
      console.log('syncCartWithDatabase: Skipping sync - isLoading:', isLoading);
      return;
    }

    console.log('syncCartWithDatabase: Starting sync for user:', userId, 'cart items:', cart.length);
    
    try {
      // Se o carrinho local está vazio, buscar do banco de dados
      if (cart.length === 0) {
        console.log('syncCartWithDatabase: Cart is empty, fetching from database');
        const cartItems = await getCartItemsFromDB(userId);
        set({ cart: cartItems });
        return;
      }

      // Verifica cada item do cart para garantir que ainda existe no banco
      const validatedCart = [];
      
      for (const item of cart) {
        const isAvailable = await validateCartItemAvailability(userId, item.scholarships.id);
        console.log('syncCartWithDatabase: Item validation:', item.scholarships.id, 'isAvailable:', isAvailable);
        if (isAvailable) {
          validatedCart.push(item);
        }
      }

      // Atualiza o cart apenas se houver diferenças
      if (validatedCart.length !== cart.length) {
        console.log('syncCartWithDatabase: Updating cart from', cart.length, 'to', validatedCart.length, 'items');
        set({ cart: validatedCart });
      } else {
        console.log('syncCartWithDatabase: No changes needed, cart is already in sync');
      }
    } catch (error) {
      console.error('Error syncing cart with database:', error);
    }
  },
}));