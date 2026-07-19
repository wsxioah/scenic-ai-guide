import { Platform } from 'react-native';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { SERVER_URL } from '../config';

const API_BASE = SERVER_URL;

class ApiClient {
  private baseUrl: string;
  private userId: number | null = null;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setUserId(id: number) {
    this.userId = id;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const doFetch = async (signal: AbortSignal) => {
      const response = await fetch(url, { ...options, headers, signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    };

    try {
      const result = await doFetch(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Retry once on network/abort errors
      if (error.name === 'AbortError' || error.message?.includes('Network request failed')) {
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
        try {
          const result = await doFetch(retryController.signal);
          clearTimeout(retryTimeoutId);
          return result;
        } catch (retryError) {
          clearTimeout(retryTimeoutId);
          throw retryError;
        }
      }
      throw error;
    }
  }

  // Auth
  async login(phone: string, code: string = '0000') {
    const result = await this.request<{ id: number; phone: string; nickname: string; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    this.token = result.token;
    return result;
  }

  // Scenic spots
  async getSpots(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<{ total: number; items: any[] }>(`/api/scenic/spots?${query}`);
  }

  async getSpotDetail(spotId: number) {
    return this.request<any>(`/api/scenic/spots/${spotId}`);
  }

  async getNearbySpots(lat: number, lng: number, radius: number = 5) {
    return this.request<any[]>(`/api/scenic/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  async getNearbyPois(lat: number, lng: number, radiusKm: number = 2, category?: string) {
    let url = `/api/poi/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`;
    if (category) url += `&category=${category}`;
    return this.request<{ pois: any[]; center: any }>(url);
  }

  // Comments
  async getComments(spotId: number, page: number = 1) {
    return this.request<any[]>(`/api/scenic/comments/${spotId}?page=${page}`);
  }

  async createComment(userId: number, scenicId: number, content: string, rating: number = 5) {
    const params = new URLSearchParams({ user_id: String(userId), scenic_id: String(scenicId), content, rating: String(rating) });
    return this.request(`/api/scenic/comments?${params}`, { method: 'POST' });
  }

  // Announcements
  async getAnnouncements() {
    return this.request<any[]>(`/api/scenic/announcements`);
  }

  // Chat
  async getConversations(userId: number) {
    return this.request<any[]>(`/api/chat/history?user_id=${userId}`);
  }

  async getMessages(conversationId: number) {
    return this.request<any[]>(`/api/chat/messages/${conversationId}`);
  }

  // TTS
  async getTTS(text: string) {
    return this.request<{ audio: string; format: string }>(`/api/voice/tts?text=${encodeURIComponent(text)}`, { method: 'POST' });
  }

  // Knowledge search
  // Scenic spot recognition from image
  async recognizeScenic(imageUri: string): Promise<{
    is_scenic: boolean;
    spot_name: string;
    confidence: number;
    category?: string;
    description?: string;
    ai_description?: string;
    lat?: number;
    lng?: number;
  }> {
    const url = `${this.baseUrl}/api/scenic/recognize`;
    const base64 = await readAsStringAsync(imageUri, {
      encoding: EncodingType.Base64,
    });

    const formData = new FormData();
    formData.append('image', base64);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // ========== Recommendations & Tracking ==========

  async getRecommendForUser(limit: number = 5) {
    return this.request<any[]>(`/api/recommend/for-user?limit=${limit}`);
  }

  async trackView(spotId: number, spotName: string) {
    return this.request(`/api/recommend/track/view?spot_id=${spotId}&spot_name=${encodeURIComponent(spotName)}`, { method: 'POST' });
  }

  async toggleFavorite(scenicSpotId: number) {
    return this.request<{ favorited: boolean; message: string }>(`/api/recommend/track/favorite?scenic_spot_id=${scenicSpotId}`, { method: 'POST' });
  }

  async getFavorites() {
    return this.request<any[]>(`/api/recommend/track/favorites`);
  }

  // FAQ
  async getFAQs(category?: string) {
    let url = '/api/faq';
    if (category) url += `?category=${category}`;
    return this.request<any[]>(url);
  }

  getBaseUrl() {
    return this.baseUrl;
  }
}

export const api = new ApiClient(API_BASE);
export default api;
