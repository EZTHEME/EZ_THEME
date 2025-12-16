<template>
  <div class="docs-container">
    <!-- 域名授权验证提示 - 如果不需要域名授权功能，移除此组件即可 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <div class="docs-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('docs.welcome.title') || '文档中心' }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('docs.welcome.description') || '查找并阅读有关使用和配置的详细文档。' }}</p>
        </div>
      </div>
      
      <!-- 标题栏 -->
      <div class="docs-header">
        <h1 class="docs-title">{{ $t('docs.title') }}</h1>
        
        <!-- 搜索框 -->
        <div class="search-wrapper">
          <div class="search-input-wrapper">
            <IconSearch class="search-icon" :size="20" />
            <input 
              type="text" 
              v-model="searchQuery" 
              :placeholder="$t('docs.searchPlaceholder')" 
              class="search-input"
              @input="handleSearch"
            />
            <button v-if="searchQuery" @click="clearSearch" class="clear-button">
              <IconX :size="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="docs-loading">
        <LoadingSpinner />
        <p>{{ $t('docs.loading') }}</p>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="error" class="docs-error">
        <IconAlertTriangle :size="48" class="error-icon" />
        <p>{{ error }}</p>
        <button class="retry-button" @click="fetchKnowledge">{{ $t('docs.retry') }}</button>
      </div>

      <!-- 文档列表 -->
      <div v-else-if="hasDocuments && Object.keys(filteredDocs).length > 0" class="docs-content">
        <!-- 遍历每个分类 -->
        <div v-for="(items, category) in filteredDocs" :key="category" class="doc-category">
          <h2 class="category-title">{{ category }}</h2>
          
          <div class="doc-items">
            <div v-for="item in items" :key="item.id" class="doc-item" @click="goToDocument(item.id)">
              <div class="doc-info">
                <h3 class="doc-title">{{ item.title }}</h3>
                <p class="doc-date">{{ $t('docs.lastUpdated') }}: {{ formatDate(item.updated_at) }}</p>
              </div>
              <div class="doc-action">
                <IconChevronRight :size="20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 - 增强版 -->
      <div v-else class="docs-empty">
        <IconFileSearch :size="48" class="empty-icon" />
        
        <!-- 根据搜索状态显示不同提示 -->
        <p v-if="searchQuery">{{ $t('docs.noSearchResults') }}</p>
        
        <!-- 无文档时的语言切换提示 -->
        <template v-else>
          <p>{{ $t('docs.noDocuments') }}</p>
          <div class="language-hint">
            <IconLanguage :size="20" class="language-icon" />
            <p class="hint-text">{{ $t('docs.languageHint', { currentLang: currentLanguage, alternateLang: alternateLanguage }) || `当前语言 ${currentLanguage} 暂无文档，请尝试切换到 ${alternateLanguage}` }}</p>
          </div>
        </template>
        
        <!-- 搜索清除按钮 -->
        <button v-if="searchQuery" @click="clearSearch" class="retry-button">{{ $t('docs.clearSearch') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup name="DocsPage">
import { ref, computed, onMounted, inject, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { 
  IconSearch, 
  IconX,
  IconChevronRight,
  IconAlertTriangle,
  IconFileSearch,
  IconLanguage
} from '@tabler/icons-vue';
import { fetchKnowledgeList } from '@/api/docs';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import { applyDomainAuth } from '@/utils/licenseAuth';

const { t, locale } = useI18n();
const router = useRouter();
const $toast = inject('$toast');

// 状态变量
const loading = ref(true);
const error = ref('');
const documents = ref({});
const searchQuery = ref('');

// 域名授权状态 - 如果不需要域名授权功能，删除这段代码
const authStatus = ref({
  isAuthorized: true,
  apiDomain: ''
});

// 获取当前语言和备用语言
const currentLanguage = computed(() => locale.value === 'zh-CN' ? '中文' : 'English');
const alternateLanguage = computed(() => locale.value === 'zh-CN' ? 'English' : '中文');

// 检查是否有文档数据
const hasDocuments = computed(() => {
  return documents.value && 
    typeof documents.value === 'object' && 
    Object.keys(documents.value).length > 0 &&
    Object.values(documents.value).some(items => 
      Array.isArray(items) && items.length > 0
    );
});

// 搜索过滤后的文档
const filteredDocs = computed(() => {
  // 没有搜索关键词时，直接返回全部文档
  if (!searchQuery.value.trim()) {
    return documents.value || {};
  }

  if (!hasDocuments.value) {
    return {};
  }

  const query = searchQuery.value.toLowerCase();
  const filtered = {};

  // 遍历每个分类及其文档
  Object.entries(documents.value).forEach(([category, items]) => {
    if (!Array.isArray(items)) return;
    
    const matchedItems = items.filter(item => 
      (item.title && item.title.toLowerCase().includes(query)) || 
      (category && category.toLowerCase().includes(query))
    );

    if (matchedItems.length > 0) {
      filtered[category] = matchedItems;
    }
  });

  return filtered;
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

// 处理搜索
const handleSearch = () => {
  // 实时搜索，不需要额外处理
};

// 清除搜索
const clearSearch = () => {
  searchQuery.value = '';
};

// 转到文档详情
const goToDocument = (id) => {
  router.push(`/docs/${id}`);
};

// 获取知识库文档
const fetchKnowledge = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = await fetchKnowledgeList(locale.value);
    
    if (result && result.data) {
      documents.value = result.data;
    } else {
      documents.value = {};
      // 数据为空时不应该视为错误，只是没有数据
    }
  } catch (err) {
    console.error('Failed to fetch knowledge list:', err);
    error.value = err.response?.message || (err && err.message ? err.message : t('docs.unknownError'));
    
    // 只有在$toast存在时才调用它
    if ($toast) {
      $toast.error(error.value);
    }
  } finally {
    loading.value = false;
  }
};

// 监听语言变化，自动重新请求文档
watch(locale, () => {
  fetchKnowledge();
});

// 组件挂载时获取文档
onMounted(() => {
  // 应用域名授权验证 - 如果不需要域名授权功能，删除这段代码
  authStatus.value = applyDomainAuth();
  
  fetchKnowledge();
});
</script>

<style lang="scss" scoped>
.docs-container {
  padding: 1.25rem;
  padding-bottom: calc(1.25rem + 64px); /* 为底部导航栏预留空间 */
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 3rem; /* 桌面版底部空间 */
  }
}

.docs-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 添加欢迎卡片样式 */
.dashboard-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    
    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
  }
  
  .card-body {
    p {
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }
  }
}

.welcome-card {
  margin-bottom: 10px;
}

.docs-header {
  margin-bottom: 2rem;
  
  .docs-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    background: linear-gradient(45deg, var(--theme-color), var(--secondary-color));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }
}

.search-wrapper {
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  
  .search-icon {
    position: absolute;
    left: 1rem;
    color: var(--text-muted);
    transition: color 0.3s ease;
  }
  
  .search-input {
    width: 100%;
    padding: 0.85rem 2.5rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 1rem;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: var(--theme-color);
      box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
      
      & + .search-icon {
        color: var(--theme-color);
      }
    }
    
    &::placeholder {
      color: var(--text-muted);
    }
  }
  
  .clear-button {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
    }
  }
}

.docs-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.doc-category {
  .category-title {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(var(--theme-color-rgb), 0.1);
    color: var(--text-color);
  }
}

.doc-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.doc-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background-color: var(--card-bg);
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
  
  .doc-info {
    flex: 1;
    overflow: hidden;
    
    .doc-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: var(--text-color);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .doc-date {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  }
  
  .doc-action {
    color: var(--text-muted);
    margin-left: 1rem;
    transition: all 0.3s ease;
  }
  
  &:hover {
    .doc-action {
      color: var(--theme-color);
      transform: translateX(3px);
    }
  }
}

.docs-loading, 
.docs-error, 
.docs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  
  p {
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 1.1rem;
  }
  
  .error-icon, 
  .empty-icon {
    color: var(--text-muted);
    opacity: 0.7;
  }
}

.retry-button {
  margin-top: 1.5rem;
  height: 40px;
  min-width: 120px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  background-color: rgba(var(--theme-color-rgb), 0.85);
  color: white;
  font-weight: 500;
  font-size: 14px;
  border: 1px solid rgba(var(--theme-color-rgb), 0.3);
  box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.25);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(var(--theme-color-rgb), 0.35);
    background-color: rgba(var(--theme-color-rgb), 0.95);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 5px 15px rgba(var(--theme-color-rgb), 0.3);
  }
}

/* 响应式调整 */
@media (min-width: 768px) {
  .doc-items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .doc-items {
    grid-template-columns: repeat(3, 1fr);
  }
}

.language-hint {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  border-radius: 8px;
  border-left: 3px solid var(--theme-color);
  
  .language-icon {
    color: var(--theme-color);
    margin-right: 0.5rem;
    flex-shrink: 0;
  }
  
  .hint-text {
    font-size: 0.9rem;
    margin: 0;
    color: var(--text-color);
    line-height: 1.5;
  }
}
</style> 