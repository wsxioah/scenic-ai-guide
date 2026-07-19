import { create } from 'zustand';
import api from '../services/api';

interface UserState {
  userId: number | null;
  token: string | null;
  phone: string;
  nickname: string;
  avatar: string | null;
  isLoggedIn: boolean;
  login: (id: number, token: string, phone: string, nickname: string, avatar?: string) => void;
  logout: () => void;
  setProfile: (data: Partial<Omit<UserState, 'login' | 'logout' | 'setProfile'>>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  token: null,
  phone: '',
  nickname: '游客',
  avatar: null,
  isLoggedIn: false,

  login: (id, token, phone, nickname, avatar) => {
    api.setToken(token);
    set({ userId: id, token, phone, nickname, avatar: avatar || null, isLoggedIn: true });
  },

  logout: () => {
    api.setToken(null);
    set({ userId: null, token: null, phone: '', nickname: '游客', avatar: null, isLoggedIn: false });
  },

  setProfile: (data) => set(data),
}));
