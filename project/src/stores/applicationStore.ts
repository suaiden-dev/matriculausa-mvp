import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Scholarship {
  id: string;
  title: string;
  amount: number;
  schoolName: string;
  level: string;
  fieldOfStudy: string;
  deadline: string;
  requirements: string[];
  benefits: string[];
  isExclusive?: boolean;
  original_annual_value: number;
  original_value_per_credit: number;
  annual_value_with_scholarship: number;
}

interface ApplicationStore {
  selectedScholarships: Scholarship[];
  addScholarship: (scholarship: Scholarship) => void;
  removeScholarship: (scholarshipId: string) => void;
  clearScholarships: () => void;
  isSelected: (scholarshipId: string) => boolean;
  getTotalAmount: () => number;
  getSelectedCount: () => number;
}

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
        return selectedScholarships.reduce((total, scholarship) => total + scholarship.amount, 0);
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