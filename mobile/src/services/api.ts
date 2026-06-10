import { Platform } from 'react-native';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

const API_BASE = 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private userId: number | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setUserId(id: number) {
    this.userId = id;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Auth
  async login(phone: string, code: string = '0000') {
    return this.request<{ id: number; phone: string; nickname: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
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

  async getRoutes() {
    return this.request<any[]>(`/api/scenic/routes`);
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
  async searchKnowledge(query: string) {
    return this.request<any>(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
  }

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

  getBaseUrl() {
    return this.baseUrl;
  }
}

export const api = new ApiClient(API_BASE);
export default api;
