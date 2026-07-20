import * as FileSystem from 'expo-file-system/legacy';

const AUTH_DIR = `${FileSystem.documentDirectory}auth/`;
const TOKEN_FILE = `${AUTH_DIR}token.json`;
const USER_FILE = `${AUTH_DIR}user.json`;

interface StoredUser {
  id: number;
  phone: string;
  nickname: string;
  avatar: string | null;
}

async function ensureDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(AUTH_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUTH_DIR, { intermediates: true });
  }
}

export async function saveAuth(token: string, user: StoredUser): Promise<void> {
  await ensureDir();
  await Promise.all([
    FileSystem.writeAsStringAsync(TOKEN_FILE, JSON.stringify({ token })),
    FileSystem.writeAsStringAsync(USER_FILE, JSON.stringify(user)),
  ]);
}

export async function getAuth(): Promise<{ token: string; user: StoredUser } | null> {
  try {
    const [tokenInfo, userInfo] = await Promise.all([
      FileSystem.getInfoAsync(TOKEN_FILE),
      FileSystem.getInfoAsync(USER_FILE),
    ]);
    if (!tokenInfo.exists || !userInfo.exists) return null;
    const [tokenData, userData] = await Promise.all([
      FileSystem.readAsStringAsync(TOKEN_FILE),
      FileSystem.readAsStringAsync(USER_FILE),
    ]);
    const { token } = JSON.parse(tokenData);
    const user: StoredUser = JSON.parse(userData);
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  try {
    await Promise.all([
      FileSystem.deleteAsync(TOKEN_FILE, { idempotent: true }),
      FileSystem.deleteAsync(USER_FILE, { idempotent: true }),
    ]);
  } catch {
    // ignore cleanup errors
  }
}
