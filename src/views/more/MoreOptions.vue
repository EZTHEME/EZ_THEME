<template>
  <div class="more-container">
    <!-- 域名授权验证提示 - 如果不需要域名授权功能，移除此组件即可 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <div class="more-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('more.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('more.description') }}</p>
        </div>
      </div>
      
      <!-- 功能导航卡片组 -->
      <div class="stats-grid">
        <div class="stats-card" @click="$router.push('/docs')">
          <div class="stats-icon">
            <IconFileText :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('docs.title') }}</div>
            <div class="stats-label">{{ $t('more.viewHelp') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <div class="stats-card" @click="$router.push('/nodes')">
          <div class="stats-icon">
            <IconServer :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('nodes.title') }}</div>
            <div class="stats-label">{{ $t('more.viewNodes') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <div class="stats-card" @click="$router.push('/orders')">
          <div class="stats-icon">
            <IconShoppingCart :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('orders.title') }}</div>
            <div class="stats-label">{{ $t('more.manageOrders') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <div class="stats-card" @click="navigateToTickets">
          <div class="stats-icon">
            <IconMessages :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('tickets.title') }}</div>
            <div class="stats-label">{{ $t('more.getTechnicalSupport') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <div class="stats-card" v-if="showTrafficLog" @click="$router.push('/trafficlog')">
          <div class="stats-icon">
            <IconChartBar :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('trafficLog.title') }}</div>
            <div class="stats-label">{{ $t('trafficLog.trafficLogDesc') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <!-- 充值选项，仅Xiao-V2board面板显示 -->
        <div v-if="isXiaoPanel" class="stats-card" @click="$router.push('/wallet/deposit')">
          <div class="stats-icon">
            <IconWallet :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('wallet.deposit.title') }}</div>
            <div class="stats-label">{{ $t('wallet.balance.description') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <div class="stats-card" @click="$router.push('/profile')">
          <div class="stats-icon">
            <IconUser :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('profile.title') }}</div>
            <div class="stats-label">{{ $t('more.manageProfile') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <!-- 自定义卡片 -->
        <template v-if="morePageConfig.enableCustomCards">
          <div 
            v-for="card in morePageConfig.customCards" 
            :key="card.id" 
            class="stats-card"
            @click="handleCustomCardClick(card)"
          >
            <div class="stats-icon">
              <!-- 使用v-html渲染自定义SVG图标 -->
              <div v-if="card.svgIcon" class="custom-svg-icon" v-html="card.svgIcon"></div>
              <!-- 保留对旧版配置的兼容，如果有icon属性就使用动态组件 -->
              <component v-else-if="card.icon" :is="getIconComponent(card.icon)" :size="32" />
              <!-- 默认图标 -->
              <IconChevronRight v-else :size="32" />
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ card.title }}</div>
              <div class="stats-label">{{ card.description }}</div>
            </div>
            <div class="chevron-icon">
              <IconChevronRight :size="20" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup name="MoreOptions">
import {
  IconFileText,
  IconShoppingCart,
  IconUser,
  IconDevices,
  IconSettings,
  IconTicket,
  IconLogout,
  IconBrandTelegram,
  IconBrandGithub,
  IconBrandDiscord,
  IconBrandTwitter,
  IconMailForward,
  IconChevronRight,
  IconServer,
  IconMessages,
  IconChartBar,
  IconWallet
} from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ref, onMounted, onUnmounted } from 'vue';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import { applyDomainAuth } from '@/utils/licenseAuth';
import { TRAFFICLOG_CONFIG, isXiaoV2board, MORE_PAGE_CONFIG } from '@/utils/baseConfig';

const { t } = useI18n();
const router = useRouter();

// 添加屏幕尺寸检测
const isSmallScreen = ref(false);

// 域名授权状态 - 如果不需要域名授权功能，删除这段代码
const authStatus = ref({
  isAuthorized: true,
  apiDomain: ''
});

const showTrafficLog = ref(false);
// 是否为Xiao-V2board面板
const isXiaoPanel = isXiaoV2board();

// 自定义卡片配置
const morePageConfig = MORE_PAGE_CONFIG;

const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < 905;
};

// 根据屏幕尺寸跳转到对应的工单页面
const navigateToTickets = () => {
  if (isSmallScreen.value) {
    router.push('/mobile/tickets');
  } else {
    router.push('/tickets');
  }
};

// 处理自定义卡片点击事件
const handleCustomCardClick = (card) => {
  if (card.url) {
    // Get a localized title for logging if available
    const cardTitle = card.title || getLocaleTitle(card.id);
    console.log(`Clicked on card: ${cardTitle}`);
    
    if (card.openInNewTab) {
      window.open(card.url, '_blank');
    } else {
      window.location.href = card.url;
    }
  }
};

// 动态导入图标组件
const getIconComponent = (iconName) => {
  // 尝试从已导入的图标中查找
  const iconMap = {
    IconFileText, IconShoppingCart, IconUser, IconDevices, 
    IconSettings, IconTicket, IconLogout, IconBrandTelegram, 
    IconBrandGithub, IconBrandDiscord, IconBrandTwitter, 
    IconMailForward, IconChevronRight, IconServer, 
    IconMessages, IconChartBar, IconWallet
  };
  
  return iconMap[iconName] || IconChevronRight; // 默认返回ChevronRight图标
};

// Add a method that uses t
const getLocaleTitle = (key) => {
  return t(`more.${key}`, key);
};

onMounted(async () => {
  // 应用域名授权验证 - 如果不需要域名授权功能，删除这段代码
  authStatus.value = await applyDomainAuth();
  
  // 判断是否启用流量明细功能
  showTrafficLog.value = TRAFFICLOG_CONFIG.enableTrafficLog;
  
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});
</script>

<style lang="scss" scoped>
.more-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  
  .more-inner {
    width: 100%;
    max-width: 1200px;
  }
  
  .welcome-card {
    margin-bottom: 24px;
  }
  
  .dashboard-card {
    background-color: var(--card-bg-color);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
    
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
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (min-width: 992px) {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .stats-card {
      background-color: var(--card-bg-color);
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      padding: 20px;
      display: flex;
      align-items: center;
      border: 1px solid var(--border-color);
      transition: all 0.3s ease;
      cursor: pointer;
      
      &:hover {
        border-color: rgba(var(--theme-color-rgb), 0.3);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }
      
      .stats-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        background-color: rgba(var(--theme-color-rgb), 0.1);
        border-radius: 12px;
        margin-right: 15px;
        color: var(--theme-color);
      }
      
      .stats-info {
        flex: 1;
        
        .stats-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-color);
          margin-bottom: 5px;
        }
        
        .stats-label {
          font-size: 14px;
          color: var(--secondary-text-color);
        }
      }
      
      .chevron-icon {
        color: var(--theme-color);
        opacity: 0.5;
        transition: all 0.3s ease;
      }
      
      &:hover {
        .chevron-icon {
          transform: translateX(3px);
          opacity: 1;
        }
      }
    }
  }
}

/* 响应式布局 */
@media (max-width: 768px) {
  .more-container {
    padding: 15px;
    padding-bottom: 80px; /* 为底部导航栏预留空间 */
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
}

/* 自定义SVG图标样式 */
.custom-svg-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  :deep(svg) {
    width: 32px;
    height: 32px;
    color: currentColor; /* 使用继承的颜色 */
  }
}
</style> 