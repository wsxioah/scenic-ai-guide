import api from './api';

export interface SSEChatCallbacks {
  onMetadata?: (data: { conversation_id: number; knowledge_count: number }) => void;
  onFragment?: (content: string) => void;
  onTTSReady?: (data: { message_id: number }) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export async function* streamChat(
  message: string,
  conversationId: number | null = null,
  userId: number | null = null,
): AsyncGenerator<{ event: string; data: any }> {
  const baseUrl = api.getBaseUrl();
  const response = await fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield { event: currentEvent, data };
        } catch {
          // skip parse errors
        }
      }
    }
  }
}

export function createSSEConnection(
  message: string,
  callbacks: SSEChatCallbacks,
  conversationId: number | null = null,
  userId: number | null = null,
): AbortController {
  const controller = new AbortController();
  const baseUrl = api.getBaseUrl();

  fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId, user_id: userId }),
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (currentEvent) {
              case 'metadata':
                callbacks.onMetadata?.(data);
                break;
              case 'answer_fragment':
                callbacks.onFragment?.(data.content);
                break;
              case 'tts_ready':
                callbacks.onTTSReady?.(data);
                break;
              case 'done':
                callbacks.onDone?.();
                break;
              case 'error':
                callbacks.onError?.(data.error);
                break;
            }
          } catch {
            // skip
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError?.(err.message);
    }
  });

  return controller;
}
