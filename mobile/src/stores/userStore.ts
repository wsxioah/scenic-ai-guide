import { create } from 'zustand';

interface UserState {
  userId: number | null;
  phone: string;
  nickname: string;
  avatar: string | null;
  isLoggedIn: boolean;
  login: (id: number, phone: string, nickname: string, avatar?: string) => void;
  logout: () => void;
  setProfile: (data: Partial<Omit<UserState, 'login' | 'logout' | 'setProfile'>>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  phone: '',
  nickname: '游客',
  avatar: null,
  isLoggedIn: false,

  login: (id, phone, nickname, avatar) =>
    set({ userId: id, phone, nickname, avatar: avatar || null, isLoggedIn: true }),

  logout: () =>
    set({ userId: null, phone: '', nickname: '游客', avatar: null, isLoggedIn: false }),

  setProfile: (data) => set(data),
}));
