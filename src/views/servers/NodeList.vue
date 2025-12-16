<template>
  <div class="nodes-container">
    <!-- 域名授权验证提示 - 如果不需要域名授权功能，移除此组件即可 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <div class="nodes-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('nodes.welcome.title') || '节点列表' }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('nodes.welcome.description') || '查看并使用可用的服务器节点' }}</p>
        </div>
      </div>
      
      <!-- 节点列表状态 -->
      <div v-if="loading" class="nodes-loading">
        <LoadingSpinner />
        <p>{{ $t('nodes.loading') || '正在加载节点...' }}</p>
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="error" class="nodes-error">
        <IconAlertTriangle :size="48" class="error-icon" />
        <p>{{ error }}</p>
        <button class="retry-button" @click="fetchNodes">{{ $t('common.retry') || '重试' }}</button>
      </div>
      
      <!-- 节点列表内容 -->
      <div v-else-if="nodes.length > 0" class="nodes-content">
        <div class="node-items">
          <div v-for="node in nodes" :key="node.id" class="node-item">
            <!-- 节点状态指示器 -->
            <div class="node-status">
              <div class="status-indicator" :class="{ 'online': node.is_online === 1 }"></div>
            </div>
            
            <!-- 节点信息 -->
            <div class="node-info">
              <!-- 标签区域 -->
              <div class="node-tags">
                <!-- 倍率标签 -->
                <span class="node-tag rate-tag" v-if="showNodeRate">x{{ node.rate }}</span>
                
                <!-- 节点类型标签 -->
                <span class="node-tag type-tag">{{ node.type }}</span>
                
                <!-- 其他标签 -->
                <template v-if="node.tags && node.tags.length > 0">
                  <span v-for="(tag, index) in node.tags" :key="index" class="node-tag">
                    {{ tag }}
                  </span>
                </template>
              </div>
              
              <!-- 节点名称 -->
              <h3 class="node-name">{{ node.name }}</h3>
              
              <!-- 节点主机信息 -->
              <p class="node-host" v-if="showNodeDetails">{{ node.host }}:{{ node.port }}</p>
            </div>
            
            <!-- 更多按钮 - 仅当配置允许显示节点倍率和允许查看节点详情时显示 -->
            <div v-if="showNodeRate && allowViewNodeInfo" class="node-actions">
              <button class="more-btn" @click="openNodeDetail(node)">
                <IconDotsVertical :size="20" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="nodes-empty">
        <IconServer :size="48" class="empty-icon" />
        <p>{{ $t('nodes.noNodes') || '暂无可用节点' }}</p>
      </div>
    </div>
    
    <!-- 节点详情模态框 -->
    <NodeDetailModal 
      v-if="allowViewNodeInfo"
      :show="showDetailModal" 
      :node="selectedNode" 
      :userInfo="userInfo"
      @close="closeNodeDetail"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { 
  IconAlertTriangle,
  IconServer,
  IconDotsVertical
} from '@tabler/icons-vue';
import { fetchServerNodes } from '@/api/servers';
import { getUserInfo } from '@/api/user';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import { applyDomainAuth } from '@/utils/licenseAuth';
import { NODES_CONFIG } from '@/utils/baseConfig';
import NodeDetailModal from '@/components/common/NodeDetailModal.vue';

const { t } = useI18n();
const $toast = inject('$toast');

// 状态变量
const loading = ref(true);
const error = ref('');
const nodes = ref([]);
const showNodeDetails = ref(NODES_CONFIG.showNodeDetails); // 使用配置控制是否显示节点详情
// 导入配置控制是否显示节点倍率
const showNodeRate = ref(NODES_CONFIG.showNodeRate);
// 是否允许查看节点详细信息
const allowViewNodeInfo = ref(NODES_CONFIG.allowViewNodeInfo);

// 用户信息
const userInfo = ref(null);

// 域名授权状态 - 如果不需要域名授权功能，删除这段代码
const authStatus = ref({
  isAuthorized: true,
  apiDomain: ''
});

// 节点详情模态框状态
const showDetailModal = ref(false);
const selectedNode = ref(null);

// 打开节点详情模态框
const openNodeDetail = (node) => {
  selectedNode.value = node;
  showDetailModal.value = true;
};

// 关闭节点详情模态框
const closeNodeDetail = () => {
  showDetailModal.value = false;
  // 延迟清空选中的节点，保证关闭动画完成后再清空
  setTimeout(() => {
    selectedNode.value = null;
  }, 300);
};

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const result = await getUserInfo();
    if (result && result.data) {
      userInfo.value = result.data;
    }
  } catch (err) {
    console.error('Failed to fetch user info:', err);
    // 显示错误提示但不影响节点列表显示
    if ($toast) {
      $toast.error(t('common.userInfoError') || '获取用户信息失败');
    }
  }
};

// 获取节点列表
const fetchNodes = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = await fetchServerNodes();
    
    if (result && result.data) {
      nodes.value = result.data;
    } else {
      nodes.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch nodes:', err);
    error.value = err.response?.message || (err && err.message ? err.message : t('common.networkError') || '网络错误');
    
    // 显示错误提示
    if ($toast) {
      $toast.error(error.value);
    }
  } finally {
    loading.value = false;
  }
};

// 组件挂载时获取节点和用户信息
onMounted(() => {
  // 应用域名授权验证 - 如果不需要域名授权功能，删除这段代码
  authStatus.value = applyDomainAuth();
  
  // 获取用户信息和节点列表
  fetchUserInfo();
  fetchNodes();
});
</script>

<style lang="scss" scoped>
.nodes-container {
  padding: 1.25rem;
  padding-bottom: calc(1.25rem + 64px); /* 为底部导航栏预留空间 */
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 3rem; /* 桌面版底部空间 */
  }
}

.nodes-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 欢迎卡片样式 */
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
  margin-bottom: 24px;
}

/* 节点列表内容 */
.nodes-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.node-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background-color: var(--card-bg);
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
  
  .node-status {
    margin-right: 1rem;
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #ccc;
      position: relative;
      
      &.online {
        background-color: #4caf50;
        box-shadow: 0 0 0 rgba(76, 175, 80, 0.4);
        animation: pulse 2s infinite;
      }
    }
  }
  
  .node-info {
    flex: 1;
    overflow: hidden;
    
    .node-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      
      .node-tag {
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        background-color: rgba(var(--theme-color-rgb), 0.1);
        color: var(--theme-color);
        
        &.rate-tag {
          background-color: rgba(76, 175, 80, 0.1);
          color: #4caf50;
          font-weight: 600;
        }
        
        &.type-tag {
          background-color: rgba(33, 150, 243, 0.1);
          color: #2196f3;
        }
      }
    }
    
    .node-name {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.35rem;
      color: var(--text-color);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .node-host {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 0;
    }
  }
  
  // 添加节点操作按钮区域样式
  .node-actions {
    display: flex;
    align-items: center;
    margin-left: 12px;
    
    .more-btn {
      background: none;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.1);
        color: var(--theme-color);
      }
    }
  }
}

/* 加载、错误和空状态 */
.nodes-loading, 
.nodes-error, 
.nodes-empty {
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

/* 呼吸动画效果 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

/* 响应式调整 */
@media (min-width: 768px) {
  .node-items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .node-items {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style> 