import { create } from 'zustand';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  feedback?: number;
}

interface ChatState {
  conversationId: number | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  addMessage: (msg: Message) => void;
  setConversationId: (id: number) => void;
  setStreaming: (v: boolean) => void;
  appendStreamContent: (text: string) => void;
  flushStreamContent: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setConversationId: (id) => set({ conversationId: id }),
  setStreaming: (v) => set({ isStreaming: v, streamingContent: '' }),
  appendStreamContent: (text) => set((s) => ({ streamingContent: s.streamingContent + text })),
  flushStreamContent: () => {
    const content = get().streamingContent;
    if (content) {
      set((s) => ({
        messages: [...s.messages, { id: Date.now(), role: 'assistant', content }],
        streamingContent: '',
        isStreaming: false,
      }));
    }
  },
  clearMessages: () => set({ messages: [], conversationId: null }),
}));
