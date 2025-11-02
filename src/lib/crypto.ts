/**
 * 加密工具模块
 * 使用 Web Crypto API 实现 AES-GCM 加密和凭据混淆
 */

/**
 * 从提取码生成加密密钥
 * @param passCode 提取码
 * @returns CryptoKey
 */
export async function deriveKeyFromPassCode(passCode: string): Promise<CryptoKey> {
  // 将提取码转换为 ArrayBuffer
  const encoder = new TextEncoder();
  const passCodeBuffer = encoder.encode(passCode);
  
  // 使用 PBKDF2 从提取码派生密钥
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passCodeBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // 使用固定的盐值（在实际应用中，每个文件应该有唯一的盐值，但为了简化，这里使用固定盐）
  const salt = encoder.encode('litek-transfer-salt-v1');
  
  // 派生 AES-GCM 密钥
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  return key;
}

/**
 * 加密数据
 * @param data 要加密的数据（字符串或对象）
 * @param passCode 提取码
 * @returns 加密后的 Base64 字符串
 */
export async function encryptData(data: string | object, passCode: string): Promise<string> {
  const key = await deriveKeyFromPassCode(passCode);
  const encoder = new TextEncoder();
  
  // 将数据转换为字符串
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);
  
  // 生成随机 IV（初始化向量）
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // 加密数据
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );
  
  // 将 IV 和加密数据合并
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  // 转换为 Base64
  return arrayBufferToBase64(combined);
}

/**
 * 解密数据
 * @param encryptedData 加密的 Base64 字符串
 * @param passCode 提取码
 * @returns 解密后的数据
 */
export async function decryptData(encryptedData: string, passCode: string): Promise<string> {
  const key = await deriveKeyFromPassCode(passCode);
  
  // 从 Base64 转换回 ArrayBuffer
  const combined = base64ToArrayBuffer(encryptedData);
  
  // 提取 IV 和加密数据
  const iv = combined.slice(0, 12);
  const encryptedBuffer = combined.slice(12);
  
  // 解密数据
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encryptedBuffer
  );
  
  // 转换回字符串
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * 混淆字符串（用于 WebDAV 凭据）
 * 使用简单的 Base64 + 字符串拆分来增加逆向难度
 * 注意：这不是真正的安全加密，只是混淆
 */
export function obfuscateString(str: string): string {
  if (!str) return '';
  
  // Base64 编码
  const encoded = btoa(str);
  
  // 字符串拆分和重组
  const parts: string[] = [];
  for (let i = 0; i < encoded.length; i += 3) {
    parts.push(encoded.slice(i, i + 3));
  }
  
  // 反转并用特殊字符连接
  return parts.reverse().join('|');
}

/**
 * 反混淆字符串
 */
export function deobfuscateString(obfuscated: string): string {
  if (!obfuscated) return '';
  
  try {
    // 拆分并反转
    const parts = obfuscated.split('|').reverse();
    
    // 重组
    const encoded = parts.join('');
    
    // Base64 解码
    return atob(encoded);
  } catch (error) {
    console.error('Failed to deobfuscate string:', error);
    return '';
  }
}

/**
 * 获取域名指纹（用于增加安全性）
 */
export function getDomainFingerprint(): string {
  const domain = window.location.hostname;
  const protocol = window.location.protocol;
  return btoa(`${protocol}//${domain}`);
}

/**
 * 生成随机提取码
 * @param length 提取码长度（默认 6）
 * @returns 提取码（数字+字母）
 */
export function generatePassCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

