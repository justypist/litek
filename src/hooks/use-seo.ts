import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseSEOOptions {
  title?: string;
  description?: string;
  baseUrl?: string;
}

/**
 * SEO Hook - 动态更新页面 SEO 元数据
 * 
 * @param options - SEO 配置选项
 * @param options.title - 页面标题（可选）
 * @param options.description - 页面描述（可选）
 * @param options.baseUrl - 网站基础 URL，默认为 https://litek.typist.cc
 * 
 * @example
 * ```tsx
 * // 在组件中使用
 * useSEO({
 *   title: 'UUID Generator',
 *   description: 'Free online UUID generator tool'
 * });
 * ```
 */
export const useSEO = (options: UseSEOOptions = {}) => {
  const location = useLocation();
  const { 
    title, 
    description, 
    baseUrl = 'https://litek.typist.cc' 
  } = options;

  useEffect(() => {
    // 构建当前页面的完整 URL
    const canonicalUrl = `${baseUrl}${location.pathname}`;
    
    // 更新或创建 canonical 链接
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 更新页面标题
    if (title) {
      document.title = `${title} - Lite Kit`;
    }

    // 更新 meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }

    // 更新 Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement;
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    }

    // 更新 Open Graph Title
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
      if (ogTitle) {
        ogTitle.setAttribute('content', `${title} - Lite Kit`);
      }

      // 更新 Twitter Card Title
      let twitterTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement;
      if (twitterTitle) {
        twitterTitle.setAttribute('content', `${title} - Lite Kit`);
      }
    }

    // 更新 Open Graph Description
    if (description) {
      let ogDescription = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
      if (ogDescription) {
        ogDescription.setAttribute('content', description);
      }

      // 更新 Twitter Card Description
      let twitterDescription = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement;
      if (twitterDescription) {
        twitterDescription.setAttribute('content', description);
      }
    }
  }, [location.pathname, title, description, baseUrl]);
};

