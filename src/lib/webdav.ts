/**
 * WebDAV 客户端模块
 * 实现文件上传、下载、删除等操作
 */

/**
 * WebDAV 配置接口
 */
export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
}

/**
 * 检查配置是否有效
 */
function isValidConfig(config: WebDAVConfig | null): config is WebDAVConfig {
  return !!config && !!config.url && !!config.username && !!config.password;
}

/**
 * 获取 WebDAV 配置
 * 从环境变量中读取（构建时注入）
 */
export function getWebDAVConfig(): WebDAVConfig | null {
  // 从 Vite 环境变量中读取（构建时注入）
  const url = import.meta.env.VITE_WEBDAV_URL || '';
  const username = import.meta.env.VITE_WEBDAV_USERNAME || '';
  const password = import.meta.env.VITE_WEBDAV_PASSWORD || '';
  
  // 开发环境下输出配置信息（不包含密码）
  if (import.meta.env.DEV) {
    console.log('WebDAV Config:', {
      url: url || '(not set)',
      username: username || '(not set)',
      hasPassword: !!password
    });
  }
  
  const envConfig: WebDAVConfig = {
    url: url,
    username: username,
    password: password
  };

  return isValidConfig(envConfig) ? envConfig : null;
}

/**
 * 检查并获取 WebDAV 配置，如果不存在则抛出错误
 */
function requireWebDAVConfig(): WebDAVConfig {
  const config = getWebDAVConfig();
  if (!config) {
    throw new Error('WebDAV service is not configured. Please contact the administrator.');
  }
  return config;
}

/**
 * 生成 Basic Auth 头
 */
function getAuthHeader(config: WebDAVConfig): string {
  const credentials = `${config.username}:${config.password}`;
  return `Basic ${btoa(credentials)}`;
}

/**
 * 构建完整的 WebDAV URL
 */
function buildUrl(config: WebDAVConfig, path: string): string {
  const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * 上传文件到 WebDAV
 * @param path 文件路径（相对于 WebDAV 根目录）
 * @param data 文件数据（Blob 或 ArrayBuffer）
 * @param onProgress 上传进度回调
 */
export async function uploadFile(
  path: string,
  data: Blob | ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<void> {
  const config = requireWebDAVConfig();
  const url = buildUrl(config, path);
  
  // 尝试确保父目录存在（某些 WebDAV 服务器可能不需要）
  const dirPath = path.substring(0, path.lastIndexOf('/'));
  if (dirPath) {
    try {
      await createDirectory(dirPath);
    } catch (error) {
      // 忽略目录创建错误，直接尝试上传
      console.warn('Directory creation failed, trying upload anyway:', error);
    }
  }
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 监听上传进度
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      // 200 OK, 201 Created, 204 No Content 都是成功
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else if (xhr.status === 409) {
        // 409 Conflict - 父目录不存在，提供更友好的错误信息
        reject(new Error(`Parent directory does not exist. Please create the 'shares' directory on your WebDAV server first.`));
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });
    
    xhr.open('PUT', url);
    xhr.setRequestHeader('Authorization', getAuthHeader(config));
    
    // 设置内容类型
    if (data instanceof Blob) {
      xhr.setRequestHeader('Content-Type', data.type || 'application/octet-stream');
      xhr.send(data);
    } else {
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.send(data);
    }
  });
}

/**
 * 从 WebDAV 下载文件
 * @param path 文件路径
 * @param onProgress 下载进度回调
 * @returns 文件数据（Blob）
 */
export async function downloadFile(
  path: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const config = requireWebDAVConfig();
  const url = buildUrl(config, path);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    
    // 监听下载进度
    if (onProgress) {
      xhr.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else if (xhr.status === 404) {
        reject(new Error('File not found'));
      } else {
        reject(new Error(`Download failed: ${xhr.status} ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during download'));
    });
    
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', getAuthHeader(config));
    xhr.send();
  });
}

/**
 * 删除 WebDAV 上的文件或目录
 * @param path 文件或目录路径
 */
export async function deleteFile(path: string): Promise<void> {
  const config = requireWebDAVConfig();
  const url = buildUrl(config, path);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': getAuthHeader(config)
    }
  });
  
  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * 创建目录
 * @param path 目录路径
 */
export async function createDirectory(path: string): Promise<void> {
  const config = requireWebDAVConfig();
  
  // 递归创建父目录
  const parts = path.split('/').filter(p => p);
  let currentPath = '';
  
  for (const part of parts) {
    currentPath += `/${part}`;
    const url = buildUrl(config, currentPath);
    
    try {
      const response = await fetch(url, {
        method: 'MKCOL',
        headers: {
          'Authorization': getAuthHeader(config)
        }
      });
      
      // 201 Created (成功创建)
      // 405 Method Not Allowed (目录已存在，某些 WebDAV 实现)
      // 409 Conflict (父目录不存在)
      if (response.ok || response.status === 405 || response.status === 301 || response.status === 302) {
        // 成功或目录已存在，继续
        if (import.meta.env.DEV) {
          console.log(`Directory ${currentPath}: ${response.status === 201 ? 'created' : 'exists'}`);
        }
      } else {
        // 其他错误，记录但继续尝试
        console.warn(`Failed to create directory ${currentPath}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Error creating directory ${currentPath}:`, error);
    }
  }
}

/**
 * 检查文件是否存在
 * @param path 文件路径
 * @returns 是否存在
 */
export async function fileExists(path: string): Promise<boolean> {
  const config = requireWebDAVConfig();
  const url = buildUrl(config, path);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': getAuthHeader(config)
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 获取文件信息
 * @param path 文件路径
 * @returns 文件大小（字节）
 */
export async function getFileInfo(path: string): Promise<{ size: number; lastModified: Date } | null> {
  const config = requireWebDAVConfig();
  const url = buildUrl(config, path);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': getAuthHeader(config)
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const size = parseInt(response.headers.get('Content-Length') || '0', 10);
    const lastModified = new Date(response.headers.get('Last-Modified') || Date.now());
    
    return { size, lastModified };
  } catch (error) {
    return null;
  }
}

/**
 * 列出目录内容（使用 PROPFIND）
 * @param path 目录路径
 * @returns 文件列表
 */
export async function listDirectory(path: string): Promise<string[]> {
  const config = requireWebDAVConfig();
  const url = buildUrl(config, path);
  
  try {
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': getAuthHeader(config),
        'Depth': '1'
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const text = await response.text();
    
    // 简单解析 WebDAV XML 响应
    // 提取所有 href 标签的内容
    const hrefRegex = /<d:href>([^<]+)<\/d:href>/g;
    const matches = text.matchAll(hrefRegex);
    const files: string[] = [];
    
    for (const match of matches) {
      const href = match[1];
      // 跳过目录本身
      if (href !== path && href !== `${path}/`) {
        files.push(href);
      }
    }
    
    return files;
  } catch (error) {
    console.error('Failed to list directory:', error);
    return [];
  }
}

/**
 * 批量删除目录（递归删除所有文件）
 * @param dirPath 目录路径
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    // 直接删除目录（WebDAV 支持递归删除）
    await deleteFile(dirPath);
  } catch (error) {
    console.error('Failed to delete directory:', error);
    throw error;
  }
}

