import { create } from 'zustand';
import api from '../services/api';
import * as authStorage from '../services/authStorage';

interface UserState {
  userId: number | null;
  token: string | null;
  phone: string;
  nickname: string;
  avatar: string | null;
  isLoggedIn: boolean;
  isRestoring: boolean;
  restoreAuth: () => Promise<void>;
  login: (id: number, token: string, phone: string, nickname: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  setProfile: (data: Partial<Omit<UserState, 'login' | 'logout' | 'setProfile' | 'restoreAuth'>>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userId: null,
  token: null,
  phone: '',
  nickname: '游客',
  avatar: null,
  isLoggedIn: false,
  isRestoring: true,

  restoreAuth: async () => {
    try {
      const saved = await authStorage.getAuth();
      if (saved) {
        api.setToken(saved.token);
        api.setUnauthorizedHandler(() => {
          get().logout();
        });
        set({
          userId: saved.user.id,
          token: saved.token,
          phone: saved.user.phone,
          nickname: saved.user.nickname,
          avatar: saved.user.avatar,
          isLoggedIn: true,
        });
      }
    } catch {
      // no saved auth
    }
    set({ isRestoring: false });
  },

  login: async (id, token, phone, nickname, avatar) => {
    api.setToken(token);
    api.setUnauthorizedHandler(() => {
      get().logout();
    });
    await authStorage.saveAuth(token, { id, phone, nickname, avatar: avatar || null });
    set({ userId: id, token, phone, nickname, avatar: avatar || null, isLoggedIn: true });
  },

  logout: async () => {
    api.setToken(null);
    api.setUnauthorizedHandler(null);
    await authStorage.clearAuth();
    set({ userId: null, token: null, phone: '', nickname: '游客', avatar: null, isLoggedIn: false });
  },

  setProfile: (data) => set(data),
}));
