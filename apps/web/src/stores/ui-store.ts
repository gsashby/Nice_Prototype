import { create } from 'zustand';

type UiStore = {
  sidebarCollapsed: boolean;
  activeView: string;
  toggleSidebar: () => void;
  setActiveView: (view: string) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  activeView: 'dashboard',
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveView: (view) => set({ activeView: view }),
}));
