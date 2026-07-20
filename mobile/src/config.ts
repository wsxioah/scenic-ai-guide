// Change this to your computer's LAN IP
// Run `ipconfig` on Windows or `ifconfig` on macOS/Linux to find it
export const SERVER_HOST = 'localhost';
export const SERVER_PORT = 8000;
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
export const WS_URL = `ws://${SERVER_HOST}:${SERVER_PORT}/ws`;

// 当前 LLM(DeepSeek) 不支持图像识别，拍照识景无法工作，暂时隐藏入口；
// 接入多模态模型后改回 true 即可恢复。
export const SHOW_PHOTO_RECOGNITION = true;
