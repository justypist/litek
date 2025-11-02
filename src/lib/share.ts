/**
 * 分享管理模块
 * 使用 IndexedDB 管理本地分享索引
 */

import { openDB, type IDBPDatabase } from 'idb';
import { nanoid } from 'nanoid';
import { encryptData, decryptData, generatePassCode } from './crypto';
import { uploadFile, downloadFile, deleteFile } from './webdav';

/**
 * 分享元数据接口
 */
export interface ShareMetadata {
  shareId: string;           // 分享 ID
  fileName: string;          // 原始文件名
  fileSize: number;          // 文件大小（字节）
  fileType: string;          // 文件 MIME 类型
  createdAt: number;         // 创建时间戳
  expiresAt: number;         // 过期时间戳
  passCode: string;          // 提取码（仅在创建时保存到本地）
}

/**
 * 过期时间选项（毫秒）
 */
export const EXPIRE_OPTIONS = {
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * 数据库名称和版本
 */
const DB_NAME = 'litek-transfer';
const DB_VERSION = 1;
const STORE_NAME = 'shares';

/**
 * 初始化 IndexedDB
 */
async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'shareId' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('expiresAt', 'expiresAt');
      }
    },
  });
}

/**
 * 创建分享
 * @param file 文件数据
 * @param fileName 文件名
 * @param expiresIn 过期时间（毫秒）
 * @param customPassCode 自定义提取码（可选，留空自动生成）
 * @param onProgress 上传进度回调
 * @returns 分享信息
 */
export async function createShare(
  file: Blob | File,
  fileName: string,
  expiresIn: number,
  customPassCode?: string,
  onProgress?: (progress: number) => void
): Promise<{ shareId: string; passCode: string; url: string }> {
  // 生成分享 ID 和提取码
  const shareId = nanoid(10);
  const passCode = customPassCode || generatePassCode(6);
  
  // 创建元数据
  const metadata: ShareMetadata = {
    shareId,
    fileName,
    fileSize: file.size,
    fileType: file.type || 'application/octet-stream',
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresIn,
    passCode,
  };
  
  try {
    // 加密元数据
    const encryptedMetadata = await encryptData(metadata, passCode);
    const metadataBlob = new Blob([encryptedMetadata], { type: 'text/plain' });
    
    // 使用扁平结构（不使用子目录）
    // 直接使用 WebDAV URL 中的路径，不添加前缀
    const filePath = `/${shareId}_file.dat`;
    const metadataPath = `/${shareId}_metadata.json.enc`;
    
    // 上传元数据
    await uploadFile(metadataPath, metadataBlob);
    
    // 上传文件（带进度）
    await uploadFile(filePath, file, onProgress);
    
    // 保存到本地索引
    const db = await getDB();
    await db.put(STORE_NAME, metadata);
    
    // 生成分享链接（使用独立路由，密码附加到 URL）
    const url = `${window.location.origin}/share/${shareId}?code=${encodeURIComponent(passCode)}`;
    
    return { shareId, passCode, url };
  } catch (error) {
    console.error('Failed to create share:', error);
    // 清理已上传的文件（扁平结构）
    try {
      await deleteFile(`/${shareId}_metadata.json.enc`);
      await deleteFile(`/${shareId}_file.dat`);
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError);
    }
    throw error;
  }
}

/**
 * 获取分享信息（需要提取码）
 * @param shareId 分享 ID
 * @param passCode 提取码
 * @returns 分享元数据
 */
export async function getShare(shareId: string, passCode: string): Promise<ShareMetadata> {
  try {
    // 从 WebDAV 下载加密的元数据
    const metadataPath = `/${shareId}_metadata.json.enc`;
    const metadataBlob = await downloadFile(metadataPath);
    const encryptedMetadata = await metadataBlob.text();
    
    // 解密元数据
    const decryptedData = await decryptData(encryptedMetadata, passCode);
    const metadata: ShareMetadata = JSON.parse(decryptedData);
    
    // 检查是否过期
    if (Date.now() > metadata.expiresAt) {
      // 过期，删除文件
      await deleteShare(shareId);
      throw new Error('Share has expired');
    }
    
    return metadata;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Share has expired') {
        throw error;
      }
      if (error.message === 'File not found') {
        throw new Error('Share not found');
      }
    }
    throw new Error('Invalid share ID or passcode');
  }
}

/**
 * 下载分享的文件
 * @param shareId 分享 ID
 * @param passCode 提取码
 * @param onProgress 下载进度回调
 * @returns 文件 Blob 和元数据
 */
export async function downloadShare(
  shareId: string,
  passCode: string,
  onProgress?: (progress: number) => void
): Promise<{ file: Blob; metadata: ShareMetadata }> {
  // 先获取元数据（验证提取码和检查过期）
  const metadata = await getShare(shareId, passCode);
  
  // 下载文件（扁平结构）
  const filePath = `/${shareId}_file.dat`;
  const file = await downloadFile(filePath, onProgress);
  
  return { file, metadata };
}

/**
 * 删除分享
 * @param shareId 分享 ID
 */
export async function deleteShare(shareId: string): Promise<void> {
  try {
    // 从 WebDAV 删除文件（扁平结构）
    await deleteFile(`/${shareId}_metadata.json.enc`);
    await deleteFile(`/${shareId}_file.dat`);
    
    // 从本地索引删除
    const db = await getDB();
    await db.delete(STORE_NAME, shareId);
  } catch (error) {
    console.error('Failed to delete share:', error);
    throw error;
  }
}

/**
 * 获取本地所有分享记录
 * @returns 分享列表
 */
export async function listLocalShares(): Promise<ShareMetadata[]> {
  const db = await getDB();
  const shares = await db.getAll(STORE_NAME);
  
  // 按创建时间倒序排列
  return shares.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 清理过期的分享
 * @returns 清理的数量
 */
export async function cleanupExpiredShares(): Promise<number> {
  const db = await getDB();
  const shares = await db.getAll(STORE_NAME);
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const share of shares) {
    if (now > share.expiresAt) {
      try {
        await deleteShare(share.shareId);
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to cleanup share ${share.shareId}:`, error);
      }
    }
  }
  
  return cleanedCount;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 格式化剩余时间
 * @param expiresAt 过期时间戳
 * @returns 格式化后的字符串
 */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;
  
  if (remaining <= 0) {
    return 'Expired';
  }
  
  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  } else {
    return 'Less than 1 minute remaining';
  }
}

/**
 * 触发浏览器下载
 * @param blob 文件 Blob
 * @param fileName 文件名
 */
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

