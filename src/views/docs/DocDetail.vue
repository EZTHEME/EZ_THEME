<template>
  <div class="doc-detail-container">
    <div class="doc-detail-inner">
      <!-- 返回按钮 -->
      <button class="back-button" @click="$router.push('/docs')">
        <IconArrowLeft :size="20" />
        <span>{{ $t('docs.backToList') }}</span>
      </button>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="doc-loading">
        <LoadingSpinner />
        <p>{{ $t('docs.loading') }}</p>
      </div>

      <!-- 错误提示 - 美化版 -->
      <div v-else-if="error" class="doc-error">
        <div class="error-card">
          <div class="error-icon-wrapper">
            <IconAlertTriangle :size="40" class="error-icon" />
          </div>
          <h3 class="error-title">{{ $t('common.networkError') || '网络错误' }}</h3>
          <p class="error-message">{{ error }}</p>
          <button class="retry-button" @click="fetchDocDetail">
            <span class="retry-text">{{ $t('docs.retry') || '重试' }}</span>
            <IconRefresh :size="16" class="retry-icon" />
          </button>
        </div>
      </div>

      <!-- 文档内容 -->
      <div v-else class="doc-content">
        <!-- 文档头部 -->
        <div class="doc-header">
          <h1 class="doc-title">{{ docData.title }}</h1>
          <div class="doc-meta">
            <span class="doc-category">{{ docData.category }}</span>
            <span class="doc-date">{{ $t('docs.lastUpdated') }}: {{ formatDate(docData.updated_at) }}</span>
          </div>
        </div>
        
        <!-- 文档正文 -->
        <div class="doc-body" v-html="renderedContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, nextTick, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { IconArrowLeft, IconAlertTriangle, IconRefresh } from '@tabler/icons-vue';
import { fetchKnowledgeDetail } from '@/api/docs';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import { SITE_CONFIG } from '@/utils/baseConfig';
import { useToast } from '@/composables/useToast';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { showToast } = useToast();
// $toast依然保留作为后备
const $toast = inject('$toast');

// 初始化markdown-it
const md = new MarkdownIt({
  html: true,           // 启用HTML标签支持
  breaks: true,         // 启用回车换行
  linkify: true,        // 自动将URL文本转换为链接
  typographer: true,    // 启用智能标点符号替换
  xhtmlOut: false       // 不使用XHTML语法，以保留原始HTML
});

// 自定义markdown-it插件，用于保留HTML块中的内容
md.renderer.rules.html_block = function(tokens, idx) {
  return tokens[idx].content;
};

// 自定义链接渲染，处理eztheme-btn类
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  let href = '';
  
  if (hrefIndex >= 0) {
    href = token.attrs[hrefIndex][1];
  }
  
  // 检查是否包含eztheme-btn标记 - 增强检测方式
  if (href.includes('#eztheme-btn') || href.includes('class=eztheme-btn') || href.includes('?eztheme-btn')) {
    // 移除所有标记
    token.attrs[hrefIndex][1] = href
      .replace('#eztheme-btn', '')
      .replace('class=eztheme-btn', '')
      .replace('?eztheme-btn', '');
    
    // 添加eztheme-btn类
    const classIndex = token.attrIndex('class');
    if (classIndex < 0) {
      token.attrPush(['class', 'eztheme-btn']);
    } else {
      const classes = token.attrs[classIndex][1];
      if (!classes.includes('eztheme-btn')) {
        token.attrs[classIndex][1] = classes + ' eztheme-btn';
      }
    }
  }
  
  // 调用默认的渲染方法
  return self.renderToken(tokens, idx, options);
};

// 状态变量
const loading = ref(true);
const error = ref('');
const docData = ref({
  id: null,
  title: '',
  category: '',
  body: '',
  updated_at: 0
});

// 判断内容是否包含主要HTML结构标签，简单Markdown内嵌的<code>等不算
const isComplexHtml = (content) => {
  if (!content) return false;
  // 检查是否包含较为复杂的HTML结构，加入style和link标签检测
  return /<(div|span|p|h[1-6]|table|tr|td|ul|ol|li|section|article|header|footer|nav|form|button|style|link)[\s>]/i.test(content);
};

// 获取用户的订阅链接（如果存在）
const getUserSubscribeUrl = () => {
  // 尝试从localStorage获取用户信息
  try {
    const userPlan = localStorage.getItem('userPlan');
    if (userPlan) {
      const parsedPlan = JSON.parse(userPlan);
      if (parsedPlan && parsedPlan.subscribeUrl) {
        return parsedPlan.subscribeUrl;
      }
    }
    
    // 如果localStorage中没有，尝试从window对象中获取
    if (window.userPlan && window.userPlan.subscribeUrl) {
      return window.userPlan.subscribeUrl;
    }
  } catch (e) {
    console.error('获取订阅链接失败:', e);
  }
  
  return ''; // 如果找不到订阅链接，返回空字符串
};

// base64编码函数
const safeBase64Encode = (str) => {
  try {
    return btoa(str);
  } catch (e) {
    console.error('Base64编码失败:', e);
    return '';
  }
};

// 处理文档中的模板变量
const processTemplateVariables = (content) => {
  if (!content) return content;
  
  const subscribeUrl = getUserSubscribeUrl();
  const siteName = SITE_CONFIG.siteName || 'EZ THEME';
  const safeBase64SubscribeUrl = safeBase64Encode(subscribeUrl);
  // 添加URL编码的订阅链接
  const urlEncodeSubscribeUrl = encodeURIComponent(subscribeUrl);
  
  return content
    .replace(/\{\{subscribeUrl\}\}/g, subscribeUrl)
    .replace(/\{\{siteName\}\}/g, siteName)
    .replace(/\{\{safeBase64SubscribeUrl\}\}/g, safeBase64SubscribeUrl)
    .replace(/\{\{urlEncodeSubscribeUrl\}\}/g, urlEncodeSubscribeUrl);
};

// 复制文本到剪贴板函数 - 更新为使用安全的toast
const copyToClipboard = (text) => {
  // 尝试使用现代Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('已复制到剪贴板', 'success');
      })
      .catch(err => {
        console.error('复制失败:', err);
        // 如果API失败，使用后备方法
        fallbackCopyToClipboard(text);
      });
  } else {
    // 使用后备复制方法
    fallbackCopyToClipboard(text);
  }
};

// 后备复制方法 - 更新为使用安全的toast
const fallbackCopyToClipboard = (text) => {
  try {
    const textarea = window.document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    window.document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    const successful = window.document.execCommand('copy');
    window.document.body.removeChild(textarea);
    
    if (successful) {
      showToast('已复制到剪贴板', 'success');
    } else {
      showToast('复制失败，请手动复制', 'error');
    }
  } catch (err) {
    console.error('后备复制方法失败:', err);
    showToast('复制失败，请手动复制', 'error');
  }
};

// 处理点击事件
const handleDocClick = (event) => {
  // 针对图标嵌套在按钮内的情况，获取实际应处理的元素
  let target = event.target;
  let button = null;
  
  // 如果点击的是图标，查找其父级按钮
  if (target.tagName === 'I' || target.tagName === 'SPAN' || target.tagName === 'SVG') {
    button = target.closest('button');
    // 如果没找到按钮但找到了a标签，尝试处理a标签
    if (!button) {
      const link = target.closest('a');
      if (link && !link.classList.contains('eztheme-btn')) {
        // 如果是普通链接，让它正常工作
        return;
      }
    }
  } else if (target.tagName === 'BUTTON') {
    button = target;
  } else {
    // 如果点击的不是按钮或图标，尝试查找最近的按钮
    button = target.closest('button');
  }
  
  // 如果找到了按钮元素
  if (button) {
    // 检查按钮内容，判断其功能
    const buttonText = button.textContent.trim().toLowerCase();
    const isSubscribeButton = buttonText.includes('复制') || 
                           buttonText.includes('订阅') || 
                           buttonText.includes('copy') || 
                           button.querySelector('.fa-copy');
    
    // 1. 处理带有onclick属性的按钮
    if (button.hasAttribute('onclick')) {
      const onclickValue = button.getAttribute('onclick');
      
      // 复制功能处理
      if (onclickValue.includes('copy(')) {
        event.preventDefault(); // 阻止默认行为
        event.stopPropagation(); // 阻止冒泡
        
        try {
          const match = onclickValue.match(/copy\(['"](.+?)['"]\)/);
          if (match && match[1]) {
            const textToCopy = match[1];
            if (textToCopy === '{{subscribeUrl}}') {
              copyToClipboard(getUserSubscribeUrl());
            } else {
              copyToClipboard(textToCopy);
            }
            return true;
          }
        } catch (e) {
          console.error('处理复制按钮出错:', e);
        }
      }
      
      // 跳转功能处理
      else if (onclickValue.includes('jump(')) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          const match = onclickValue.match(/jump\((\d+)\)/);
          if (match && match[1]) {
            const docId = match[1];
            router.push(`/docs/${docId}`);
            return true;
          }
        } catch (e) {
          console.error('处理跳转按钮出错:', e);
        }
      }
      
      // 其他onclick情况，直接执行
      return;
    }
    
    // 2. 处理data-original-onclick属性
    if (button.hasAttribute('data-original-onclick')) {
      const onclickValue = button.getAttribute('data-original-onclick');
      event.preventDefault();
      
      // 复制功能处理
      if (onclickValue.includes('copy(')) {
        try {
          const match = onclickValue.match(/copy\(['"](.+?)['"]\)/);
          if (match && match[1]) {
            const textToCopy = match[1];
            if (textToCopy === '{{subscribeUrl}}') {
              copyToClipboard(getUserSubscribeUrl());
            } else {
              copyToClipboard(textToCopy);
            }
            return true;
          }
        } catch (e) {
          console.error('处理复制按钮出错:', e);
        }
      }
      
      // 跳转功能处理
      else if (onclickValue.includes('jump(')) {
        try {
          const match = onclickValue.match(/jump\((\d+)\)/);
          if (match && match[1]) {
            const docId = match[1];
            router.push(`/docs/${docId}`);
            return true;
          }
        } catch (e) {
          console.error('处理跳转按钮出错:', e);
        }
      }
    }
    
    // 3. 通过按钮文本内容判断功能
    if (isSubscribeButton) {
      event.preventDefault();
      const subscribeUrl = getUserSubscribeUrl();
      if (subscribeUrl) {
        copyToClipboard(subscribeUrl);
        return true;
      }
    }
    
    // 4. 处理data-href属性（为a标签中的按钮准备的）
    if (button.hasAttribute('data-href')) {
      event.preventDefault();
      const href = button.getAttribute('data-href');
      const target = button.getAttribute('data-target');
      
      if (href) {
        if (target === '_blank') {
          window.open(href, '_blank');
        } else if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
          router.push(href);
        } else {
          // 修复外部链接跳转问题
          // 检查链接是否有http前缀，如果没有则添加https://
          const externalHref = href.match(/^https?:\/\//) ? href : `https://${href}`;
          // 使用window.open打开外部链接，避免被Vue Router拦截
          window.open(externalHref, target || '_blank');
        }
        return true;
      }
    }
  }
  
  // 5. 备用：直接查找带有特定文本的复制按钮
  if (event.target.textContent && 
      (event.target.textContent.includes('复制') || 
       event.target.textContent.includes('copy') ||
       event.target.textContent.includes('订阅'))) {
    const subscribeUrl = getUserSubscribeUrl();
    if (subscribeUrl) {
      event.preventDefault();
      copyToClipboard(subscribeUrl);
      return true;
    }
  }
};

// 渲染内容
const renderedContent = computed(() => {
  let content = docData.value.body || '';
  
  if (!content) {
    return '';
  }
  
  try {
    // 处理模板变量
    content = processTemplateVariables(content);
    
    // 先使用Markdown渲染器渲染内容
    let renderedMd = '';
    try {
      // 使用markdown-it渲染Markdown内容
      renderedMd = md.render(content);
    } catch (mdError) {
      console.error('Markdown渲染失败:', mdError);
      // 如果Markdown渲染失败，使用原始内容
      renderedMd = content;
    }
    
    // 检查是否包含复杂HTML或已经渲染后的HTML
    if (isComplexHtml(content) || isComplexHtml(renderedMd)) {
      // 使用已经渲染好的Markdown内容进行后续处理
      let processedContent = renderedMd;
      
      // 提取自定义样式，确保它们不会被移除或修改
      const styleTagRegex = /<style[\s\S]*?<\/style>/gi;
      const styleMatches = [];
      let match;
      while ((match = styleTagRegex.exec(content)) !== null) {
        styleMatches.push(match[0]);
      }
      
      // 在页面上添加全局函数
      nextTick(() => {
        // 直接将函数注入到document中
        const scriptElement = document.createElement('script');
        scriptElement.innerHTML = `
          // 全局复制函数
          function copy(text) {
            if (text === '{{subscribeUrl}}') {
              // 获取订阅URL
              let subscribeUrl = '';
              try {
                const userPlan = localStorage.getItem('userPlan');
                if (userPlan) {
                  const parsedPlan = JSON.parse(userPlan);
                  if (parsedPlan && parsedPlan.subscribeUrl) {
                    subscribeUrl = parsedPlan.subscribeUrl;
                  }
                } else if (window.userPlan && window.userPlan.subscribeUrl) {
                  subscribeUrl = window.userPlan.subscribeUrl;
                }
              } catch (e) {
                console.error('获取订阅链接失败:', e);
              }
              
              // 复制到剪贴板
              navigator.clipboard.writeText(subscribeUrl)
                .then(() => {
                  // 使用站内通知替代alert
                  if (window.$toast && typeof window.$toast.success === 'function') {
                    window.$toast.success('已复制到剪贴板');
                  } else {
                    // 尝试找到Vue实例上的toast
                    const event = new CustomEvent('eztheme-toast', { 
                      detail: { message: '已复制到剪贴板', type: 'success' } 
                    });
                    document.dispatchEvent(event);
                  }
                })
                .catch(() => {
                  const ta = document.createElement('textarea');
                  ta.value = subscribeUrl;
                  ta.style.position = 'fixed';
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                  
                  // 使用站内通知替代alert
                  if (window.$toast && typeof window.$toast.success === 'function') {
                    window.$toast.success('已复制到剪贴板');
                  } else {
                    const event = new CustomEvent('eztheme-toast', { 
                      detail: { message: '已复制到剪贴板', type: 'success' } 
                    });
                    document.dispatchEvent(event);
                  }
                });
            } else {
              // 复制普通文本
              navigator.clipboard.writeText(text)
                .then(() => {
                  // 使用站内通知替代alert
                  if (window.$toast && typeof window.$toast.success === 'function') {
                    window.$toast.success('已复制到剪贴板');
                  } else {
                    const event = new CustomEvent('eztheme-toast', { 
                      detail: { message: '已复制到剪贴板', type: 'success' } 
                    });
                    document.dispatchEvent(event);
                  }
                })
                .catch(() => {
                  const ta = document.createElement('textarea');
                  ta.value = text;
                  ta.style.position = 'fixed';
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                  
                  // 使用站内通知替代alert
                  if (window.$toast && typeof window.$toast.success === 'function') {
                    window.$toast.success('已复制到剪贴板');
                  } else {
                    const event = new CustomEvent('eztheme-toast', { 
                      detail: { message: '已复制到剪贴板', type: 'success' } 
                    });
                    document.dispatchEvent(event);
                  }
                });
            }
          }
          
          // 全局跳转函数 - 修正路径
          function jump(docId) {
            // 修复链接路径，添加/#/前缀
            window.location.href = '/#/docs/' + docId;
          }
        `;
        document.head.appendChild(scriptElement);
        
        // 为自定义事件添加监听器，确保toast能正常显示
        document.addEventListener('eztheme-toast', function(e) {
          if (e.detail && e.detail.message) {
            // 尝试使用组件实例上的showToast
            if (window.showToast) {
              window.showToast(e.detail.message, e.detail.type || 'success');
            } 
            // 或者使用 $toast 实例
            else if (window.$toast) {
              const type = e.detail.type || 'success';
              if (typeof window.$toast[type] === 'function') {
                window.$toast[type](e.detail.message);
              }
            }
          }
        });
        
        // 监听点击事件
        const docBody = document.querySelector('.doc-body');
        if (docBody) {
          docBody.removeEventListener('click', handleDocClick);
          docBody.addEventListener('click', handleDocClick);
        }
      });
      
      // 清理和处理HTML
      processedContent = DOMPurify.sanitize(processedContent, {
        ADD_TAGS: ['script', 'style', 'link', 'button', 'a', 'img', 'iframe', 'div', 'span'],
        ADD_ATTR: [
          'onclick', 'class', 'style', 'type', 'rel', 'href', 'target', 
          'src', 'alt', 'title', 'width', 'height', 'frameborder', 'allowfullscreen',
          'data-original-onclick', 'data-href', 'data-target', 'data-*'
        ],
        ALLOW_DATA_ATTR: true,
        WHOLE_DOCUMENT: false,
        FORCE_BODY: false,
        FORBID_TAGS: [],
        FORBID_ATTR: [],
        ALLOW_UNKNOWN_PROTOCOLS: true,
        ALLOW_ARIA_ATTR: true
      });
      
      // 如果有自定义样式，将它们添加回处理后的内容
      if (styleMatches.length > 0) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedContent;
        styleMatches.forEach(styleTag => {
          tempDiv.insertAdjacentHTML('beforeend', styleTag);
        });
        processedContent = tempDiv.innerHTML;
      }
      
      // 处理HTML按钮
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedContent;
      
      // 确保所有按钮都有eztheme-btn类和正确的点击处理
      const buttons = tempDiv.querySelectorAll('button');
      buttons.forEach(button => {
        // 添加样式类
        if (!button.classList.contains('eztheme-btn')) {
          button.classList.add('eztheme-btn');
        }
        
        // 分析按钮文本，自动添加复制功能
        const buttonText = button.textContent.trim().toLowerCase();
        if ((buttonText.includes('复制') || buttonText.includes('copy')) && 
            !button.hasAttribute('onclick')) {
          button.setAttribute('onclick', "copy('{{subscribeUrl}}')");
        }
        
        // 保存按钮上的所有链接相关属性
        if (button.hasAttribute('href')) {
          button.setAttribute('data-href', button.getAttribute('href'));
        }
        
        // 检查是否包含子级a标签
        const childLink = button.querySelector('a');
        if (childLink && childLink.hasAttribute('href')) {
          button.setAttribute('data-href', childLink.getAttribute('href'));
          if (childLink.hasAttribute('target')) {
            button.setAttribute('data-target', childLink.getAttribute('target'));
          }
        }
      });
      
      // 处理可能被转换为普通文本的链接
      const links = tempDiv.querySelectorAll('a');
      links.forEach(link => {
        if (link.textContent.trim().toLowerCase().includes('复制') || 
            link.textContent.trim().toLowerCase().includes('订阅') || 
            link.textContent.trim().toLowerCase().includes('copy')) {
          link.classList.add('eztheme-btn');
        }
      });
      
      return tempDiv.innerHTML;
    } else {
      // 直接返回Markdown渲染结果
      return renderedMd;
    }
  } catch (err) {
    console.error('Error processing content:', err);
    return `<p class="error-message">${t('docs.contentFormatError')}</p>`;
  }
});

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// 获取文档详情
const fetchDocDetail = async () => {
  const docId = route.params.id;
  
  if (!docId) {
    error.value = t('docs.invalidDocId');
    loading.value = false;
    return;
  }
  
  loading.value = true;
  error.value = '';

  try {
    // 使用API函数获取文档详情
    const result = await fetchKnowledgeDetail(docId, locale.value);
    
    if (result && result.data) {
      docData.value = result.data;
      
      // 确保兼容性，如果接口返回的是content而不是body，则进行适配
      if (!docData.value.body && docData.value.content) {
        docData.value.body = docData.value.content;
      }
    } else {
      throw new Error(t('docs.docNotFound'));
    }
  } catch (err) {
    console.error('Failed to fetch document detail:', err);
    error.value = err && err.message ? err.message : t('docs.unknownError');
    
    // 只有在$toast存在时才调用它
    if ($toast) {
      $toast.error(error.value);
    }
  } finally {
    loading.value = false;
  }
};

// 组件挂载时获取文档详情
onMounted(() => {
  // 获取文档详情
  fetchDocDetail();
});

// 组件卸载时清理事件监听和全局函数
onUnmounted(() => {
  const docBody = window.document.querySelector('.doc-body');
  if (docBody) {
    docBody.removeEventListener('click', handleDocClick);
  }
});
</script>

<style lang="scss" scoped>
.doc-detail-container {
  padding: 1.25rem;
  padding-bottom: calc(1.25rem + 64px); /* 为底部导航栏预留空间 */
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 3rem; /* 桌面版底部空间 */
  }
}

.doc-detail-inner {
  max-width: 1200px; /* 与docs-inner保持一致 */
  margin: 0 auto;
  width: 100%;
}

.back-button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  color: var(--theme-color);
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    transform: translateX(-3px);
  }
  
  &:active {
    transform: translateX(0);
  }
  
  span {
    margin-left: 0.5rem;
  }
}

.doc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  
  p {
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 1.1rem;
  }
}

/* 美化的错误提示样式 */
.doc-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  
  .error-card {
    width: 100%;
    max-width: 400px;
    background: var(--card-bg);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(var(--theme-color-rgb), 0.1);
    animation: errorAppear 0.5s ease-out;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    @keyframes errorAppear {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }
  
  .error-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255, 76, 81, 0.1);
    margin-bottom: 1.5rem;
    
    .error-icon {
      color: #ff4c51;
    }
  }
  
  .error-title {
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--text-color);
  }
  
  .error-message {
    color: var(--text-muted);
    font-size: 1rem;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }
}

/* 美化的重试按钮 */
.retry-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 2rem;
  border-radius: 30px;
  background: linear-gradient(135deg, var(--theme-color), var(--theme-color-dark));
  color: white;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.3);
  
  .retry-text {
    margin-right: 0.5rem;
  }
  
  .retry-icon {
    transition: transform 0.4s ease;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(var(--theme-color-rgb), 0.4);
    
    .retry-icon {
      transform: rotate(180deg);
    }
  }
  
  &:active {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(var(--theme-color-rgb), 0.3);
  }
}

.doc-content {
  background-color: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  width: 100%;
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  &:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.2);
  }
}

.doc-header {
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid rgba(var(--theme-color-rgb), 0.1);
  
  .doc-title {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--text-color);
    line-height: 1.3;
    
    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
  
  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--text-muted);
    
    .doc-category {
      padding: 0.3rem 0.7rem;
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
      border-radius: 4px;
      font-weight: 500;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.2);
      }
    }
    
    .doc-date {
      display: flex;
      align-items: center;
    }
  }
}

.doc-body {
  color: var(--text-color);
  font-size: 1rem;
  line-height: 1.8;
  
  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 2rem;
    margin-bottom: 1.2rem;
    font-weight: 600;
    line-height: 1.4;
    color: var(--primary-text-color);
    position: relative;
    transition: color 0.2s ease;
  }
  
  :deep(h1) {
    font-size: 2.2rem;
    margin-top: 2.8rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  :deep(h2) {
    font-size: 1.8rem;
    padding-bottom: 0.5rem;
    margin-top: 2.2rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  :deep(h3) {
    font-size: 1.5rem;
    margin-top: 1.8rem;
  }
  
  :deep(h4) {
    font-size: 1.25rem;
    color: var(--primary-text-color);
  }
  
  :deep(h5) {
    font-size: 1.1rem;
    color: var(--primary-text-color);
  }
  
  :deep(h6) {
    font-size: 1rem;
    color: var(--text-muted);
    font-weight: 500;
  }
  
  :deep(p) {
    margin-bottom: 1.4rem;
    letter-spacing: 0.01rem;
  }
  
  :deep(ul), :deep(ol) {
    margin-bottom: 1.4rem;
    padding-left: 1.8rem;
    
    li {
      margin-bottom: 0.8rem;
      position: relative;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  :deep(ul li) {
    list-style-type: disc;
    
    & > ul > li {
      list-style-type: circle;
      
      & > ul > li {
        list-style-type: square;
      }
    }
  }
  
  :deep(ol li) {
    list-style-type: decimal;
    
    & > ol > li {
      list-style-type: lower-alpha;
      
      & > ol > li {
        list-style-type: lower-roman;
      }
    }
  }
  
  :deep(img) {
    max-width: 100%;
    border-radius: 6px;
    margin: 1.8rem auto;
    display: block;
    transition: all 0.3s ease;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    &:hover {
      transform: scale(1.01);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--theme-color);
    }
  }
  
  /* 代码样式 */
  :deep(code) {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    background-color: var(--code-bg);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    color: var(--theme-color);
    border: 1px solid rgba(var(--theme-color-rgb), 0.1);
    transition: background-color 0.2s ease;
    margin: 0 2px;
  }
  
  :deep(pre) {
    background-color: var(--code-bg);
    padding: 1.2rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1.8rem 0;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    position: relative;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
      border-color: var(--theme-color);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    code {
      background: none;
      padding: 0;
      color: var(--text-color);
      border: none;
      font-size: 0.9rem;
      line-height: 1.6;
      text-shadow: none;
    }
  }
  
  /* 链接样式 */
  :deep(a:not(.eztheme-btn)) {
    color: rgba(var(--theme-color-rgb), 1);
    text-decoration: none;
    transition: color 0.2s ease;
    font-weight: 500;
    
    &:hover {
      color: rgba(var(--theme-color-rgb), 0.8);
    }
  }
  
  /* 引用块样式 */
  :deep(blockquote) {
    border-left: 4px solid var(--theme-color);
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 1.8rem;
    color: var(--text-muted);
    font-style: italic;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    padding: 1.2rem 1.5rem;
    border-radius: 0 6px 6px 0;
    position: relative;
    transition: background-color 0.2s ease, border-left-color 0.2s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.08);
    }
    
    p {
      margin-bottom: 0.8rem;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  /* 表格样式 */
  :deep(table) {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1.8rem 0;
    overflow-x: auto;
    display: block;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: rgba(var(--theme-color-rgb), 0.2);
    }
    
    @media (min-width: 768px) {
      display: table;
    }
    
    thead {
      background-color: rgba(var(--theme-color-rgb), 0.05);
      
      tr {
        border-bottom: 2px solid var(--border-color);
      }
    }
    
    th, td {
      padding: 0.8rem 1rem;
      border: 1px solid var(--border-color);
      text-align: left;
    }
    
    th {
      font-weight: 600;
      color: var(--primary-text-color);
    }
    
    tr {
      transition: background-color 0.2s ease;
      
      &:nth-child(even) {
        background-color: rgba(var(--hover-bg-rgb), 0.3);
      }
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.05);
      }
    }
  }
  
  /* 水平线样式 */
  :deep(hr) {
    height: 1px;
    border: none;
    background-color: var(--border-color);
    margin: 2rem 0;
  }
  
  /* 强调文本 */
  :deep(strong) {
    font-weight: 600;
    color: var(--primary-text-color);
  }
  
  :deep(em) {
    font-style: italic;
  }
  
  /* 任务列表 */
  :deep(input[type="checkbox"]) {
    margin-right: 0.5rem;
  }
  
  /* 脚注 */
  :deep(.footnotes) {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  
  /* access 内容样式 */
  :deep(.access-content) {
    margin: 2rem 0;
    padding: 1.5rem;
    border-radius: 6px;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border: 1px solid rgba(var(--theme-color-rgb), 0.15);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: rgba(var(--theme-color-rgb), 0.3);
    }
    
    &::before {
      content: '特别内容';
      position: absolute;
      top: 0.8rem;
      right: 1rem;
      font-size: 0.8rem;
      color: var(--theme-color);
      background-color: rgba(var(--theme-color-rgb), 0.1);
      padding: 0.2rem 0.8rem;
      border-radius: 20px;
      font-weight: 500;
    }
  }
}
</style>

<!-- 全局样式，不受scoped限制 -->
<style lang="scss">
/* 在markdown或HTML内容中的按钮样式 */
.eztheme-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  background-color: rgba(var(--theme-color-rgb), 0.1) !important;
  color: var(--theme-color) !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  font-weight: 500 !important;
  margin: 8px 4px !important;
  text-decoration: none !important;
  border-bottom: none !important;
  text-align: center !important;
  box-shadow: none !important;
  border-color: transparent !important;
  width: auto !important;
  line-height: 1.5 !important;
  height: auto !important;
  min-height: unset !important;
  max-width: unset !important;
  overflow: visible !important;
  
  /* 确保按钮内的图标正确显示 */
  i, .icon, svg {
    margin-right: 6px !important;
    display: inline-flex !important;
    vertical-align: middle !important;
  }
  
  &:hover, &:active, &:focus, &:visited {
    background-color: rgba(var(--theme-color-rgb), 0.2) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 8px rgba(var(--theme-color-rgb), 0.1) !important;
    border-bottom: none !important;
    text-decoration: none !important;
    color: var(--theme-color) !important;
    border-color: transparent !important;
  }
  
  &:active {
    transform: translateY(0) !important;
    box-shadow: none !important;
  }
  
  &:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.3) !important;
  }
}

/* 重置Markdown引擎可能添加的链接样式 */
a.eztheme-btn {
  background-image: none !important;
  background-repeat: no-repeat !important;
  background-position: initial !important;
  background-size: initial !important;
  text-decoration: none !important;
  border-bottom: none !important;
  
  &::after, &::before {
    display: none !important;
    content: none !important;
  }
}
</style> 