<template>
  <div class="orders-container">
    <div class="orders-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('orders.welcome.title') || '订单列表' }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('orders.welcome.description') || '查看并管理您的订单' }}</p>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="orders-loading">
        <LoadingSpinner />
        <p>{{ headerTexts.loading }}</p>
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="error" class="orders-error">
        <IconAlertTriangle :size="48" class="error-icon" />
        <p>{{ error }}</p>
        <button class="retry-button" @click="fetchOrders">{{ $t('common.retry') || '重试' }}</button>
      </div>
      
      <!-- 订单列表 -->
      <div v-else-if="orders.length > 0" class="orders-content">
        <!-- 分页控制 -->
        <div class="pagination-container" v-if="totalPages > 1">
          <div class="pagination">
            <button 
              class="page-button prev" 
              @click="prevPage" 
              :disabled="currentPage === 1"
              :class="{ 'disabled': currentPage === 1 }"
            >
              <IconChevronLeft :size="16" />
            </button>
            
            <div class="page-info">
              {{ $t('common.page') || '页' }} {{ currentPage }} / {{ totalPages }}
            </div>
            
            <button 
              class="page-button next" 
              @click="nextPage" 
              :disabled="currentPage === totalPages"
              :class="{ 'disabled': currentPage === totalPages }"
            >
              <IconChevronRight :size="16" />
            </button>
          </div>
        </div>

        <!-- 移动端卡片视图 -->
        <div class="order-cards" 
             v-if="isMobileView"
             @touchstart="handleTouchStart" 
             @touchmove="handleTouchMove" 
             @touchend="handleTouchEnd">
          <!-- 滑动提示 -->
          <div class="swipe-hint" v-if="orders.length > pageSize">
            <IconArrowLeft :size="16" class="swipe-icon" />
            <span>{{ $t('common.swipeHint') || '左右滑动切换' }}</span>
            <IconArrowRight :size="16" class="swipe-icon" />
          </div>
          
          <transition-group :name="slideDirection === 'right' ? 'page-switch-right' : 'page-switch'">
            <div v-for="order in paginatedOrders" :key="order.trade_no" class="order-card">
              <div class="order-card-header">
                <div class="order-number">
                  <span class="label">{{ headerTexts.tradeNo }}:</span>
                  <span class="value">{{ order.trade_no }}</span>
                </div>
                <div class="status-wrapper">
                  <span class="status-badge" :class="getStatusClass(order.status)">
                    {{ getStatusText(order.status) }}
                  </span>
                </div>
              </div>
              
              <div class="order-card-body">
                <div class="info-row">
                  <span class="label">{{ headerTexts.createdAt }}:</span>
                  <span class="value">{{ formatDate(order.created_at) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">{{ headerTexts.cycle }}:</span>
                  <span class="value">{{ formatCycle(order.period) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">{{ headerTexts.totalAmount }}:</span>
                  <span class="value amount">{{ formatAmount(order.total_amount) }}</span>
                </div>
              </div>
              
              <div class="order-card-footer">
                <button 
                  class="action-button view-button" 
                  @click="viewOrderDetail(order.trade_no)" 
                >
                  <IconEye :size="16" />
                  <span>{{ headerTexts.viewDetail }}</span>
                </button>
                <button 
                  class="action-button cancel-button" 
                  @click="showCancelConfirm(order.trade_no)" 
                  :disabled="order.status !== 0"
                  :class="{ 'disabled': order.status !== 0 }"
                >
                  <IconX :size="16" />
                  <span>{{ headerTexts.cancel }}</span>
                </button>
              </div>
            </div>
          </transition-group>
        </div>

        <!-- 桌面端表格视图 -->
        <div class="order-table-container" 
             v-else
             @touchstart="handleTouchStart" 
             @touchmove="handleTouchMove" 
             @touchend="handleTouchEnd">
          <table class="order-table">
            <thead>
              <tr>
                <th width="22%">{{ headerTexts.tradeNo }}</th>
                <th width="16%">{{ headerTexts.createdAt }}</th>
                <th width="10%">{{ headerTexts.cycle }}</th>
                <th width="14%">{{ headerTexts.totalAmount }}</th>
                <th width="14%">{{ headerTexts.statusLabel }}</th>
                <th width="24%">{{ headerTexts.actions }}</th>
              </tr>
            </thead>
            <tbody>
              <transition-group :name="slideDirection === 'right' ? 'page-switch-right' : 'page-switch'">
                <tr v-for="order in paginatedOrders" :key="order.trade_no">
                  <td class="trade-no">{{ order.trade_no }}</td>
                  <td>{{ formatDate(order.created_at) }}</td>
                  <td>{{ formatCycle(order.period) }}</td>
                  <td class="amount">{{ formatAmount(order.total_amount) }}</td>
                  <td>
                    <span class="status-badge" :class="getStatusClass(order.status)">
                      {{ getStatusText(order.status) }}
                    </span>
                  </td>
                  <td class="actions">
                    <button 
                      class="action-button view-button" 
                      @click="viewOrderDetail(order.trade_no)" 
                    >
                      <IconEye :size="16" />
                      <span>{{ headerTexts.viewDetail }}</span>
                    </button>
                    <button 
                      class="action-button cancel-button" 
                      @click="showCancelConfirm(order.trade_no)" 
                      :disabled="order.status !== 0"
                      :class="{ 'disabled': order.status !== 0 }"
                    >
                      <IconX :size="16" />
                      <span>{{ headerTexts.cancel }}</span>
                    </button>
                  </td>
                </tr>
              </transition-group>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="orders-empty">
        <IconShoppingCart :size="48" class="empty-icon" />
        <p>{{ headerTexts.noOrders }}</p>
        <button class="shop-button" @click="$router.push('/shop')">
          <IconShoppingCart :size="16" />
          <span>{{ headerTexts.goShopping }}</span>
        </button>
      </div>
      
      <!-- 取消订单确认弹窗 -->
      <transition name="modal-fade">
        <div class="modal-overlay" v-if="showConfirmModal" @click="closeConfirmModal">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>{{ headerTexts.cancelConfirmTitle }}</h3>
              <button class="modal-close" @click="closeConfirmModal">
                <IconX :size="20" />
              </button>
            </div>
            <div class="modal-body">
              <p>{{ headerTexts.cancelConfirmText }}</p>
              <div class="trade-no-info">
                <span>{{ headerTexts.tradeNo }}:</span>
                <span class="trade-no">{{ currentTradeNo }}</span>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="closeConfirmModal">
                {{ $t('common.cancel') || '取消' }}
              </button>
              <button class="btn-confirm" @click="confirmCancelOrder" :disabled="canceling">
                <span v-if="canceling" class="loader"></span>
                <span>{{ $t('common.confirm') || '确认' }}</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { 
  IconAlertTriangle,
  IconShoppingCart,
  IconEye,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconArrowLeft,
  IconArrowRight
} from '@tabler/icons-vue';
import { fetchOrderList, cancelOrder } from '@/api/orderlist';
import { getCommConfig } from '@/api/shop';

const { t, locale } = useI18n();
const router = useRouter();
const $toast = inject('$toast');

// 状态变量
const loading = ref(true);
const error = ref('');
const orders = ref([]);
const showConfirmModal = ref(false);
const currentTradeNo = ref('');
const canceling = ref(false);
const isMobileView = ref(false);
const slideDirection = ref('left'); // 新增：记录滑动方向，默认为左
const currencySymbol = ref('¥'); // 默认货币符号

// 检测移动设备视图
const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 768;
};

// 监听窗口大小变化
window.addEventListener('resize', checkMobileView);

// 分页相关
const currentPage = ref(1);
const pageSize = 10; // 每页显示10条数据

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(orders.value.length / pageSize);
});

// 获取当前页的订单
const paginatedOrders = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return orders.value.slice(startIndex, endIndex);
});

// 触摸滑动相关变量
const touchStartX = ref(0);
const touchEndX = ref(0);
const minSwipeDistance = 50; // 最小滑动触发距离

// 处理触摸开始
const handleTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX;
};

// 处理触摸移动
const handleTouchMove = (e) => {
  touchEndX.value = e.touches[0].clientX;
};

// 处理触摸结束
const handleTouchEnd = () => {
  const swipeDistance = touchEndX.value - touchStartX.value;
  
  // 如果滑动距离超过最小触发距离
  if (Math.abs(swipeDistance) > minSwipeDistance) {
    if (swipeDistance > 0) {
      // 右滑，上一页
      slideDirection.value = 'right';
      prevPage();
    } else {
      // 左滑，下一页
      slideDirection.value = 'left';
      nextPage();
    }
  }
  
  // 重置触摸值
  touchStartX.value = 0;
  touchEndX.value = 0;
};

// 下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    slideDirection.value = 'left';
    currentPage.value++;
  }
};

// 上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    slideDirection.value = 'right';
    currentPage.value--;
  }
};

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = await fetchOrderList();
    
    if (result && result.data) {
      orders.value = result.data;
      // 重置到第一页
      currentPage.value = 1;
    } else {
      orders.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    error.value = err && err.message ? err.message : t('common.networkError') || '网络错误';
    
    // 显示错误提示
    if ($toast) {
      $toast.error(error.value);
    }
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化周期
const formatCycle = (cycle) => {
  if (!cycle) return '--';
  
  // 周期映射，根据API返回的cycle值映射到对应的显示文本
  const cycleMap = {
    'month_price': t('shop.plan.price_options.month') || '月付',
    'quarter_price': t('shop.plan.price_options.quarter') || '季度',
    'half_year_price': t('shop.plan.price_options.half_year') || '半年',
    'year_price': t('shop.plan.price_options.year') || '一年',
    'two_year_price': t('shop.plan.price_options.two_year') || '两年',
    'three_year_price': t('shop.plan.price_options.three_year') || '三年',
    'onetime_price': t('shop.plan.price_options.onetime') || '一次性',
    'reset_price': t('shop.plan.price_options.reset_price') || '重置流量包',
    'deposit': t('shop.plan.price_options.deposit') || '充值' //xiao版
  };
  
  return cycleMap[cycle] || cycle;
};

// 格式化金额
const formatAmount = (amount) => {
  if (amount === null || amount === undefined) return '--';
  return currencySymbol.value + (amount / 100).toFixed(2);
};

// 获取订单状态文字 - 修改为计算属性，确保在语言变化时能重新计算
const statusTextMap = computed(() => {
  return {
    0: t('orders.status.pending', '待支付'),
    1: t('orders.status.processing', '开通中'),
    2: t('orders.status.cancelled', '已取消'),
    3: t('orders.status.completed', '已完成'), 
    4: t('orders.status.discounted', '已折抵'),
    unknown: t('orders.status.unknown', '未知状态')
  };
});

// 获取订单状态文字
const getStatusText = (status) => {
  return statusTextMap.value[status] || `${statusTextMap.value.unknown} (${status})`;
};

// 获取订单状态类名
const getStatusClass = (status) => {
  const statusClassMap = {
    0: 'status-pending',
    1: 'status-processing',
    2: 'status-cancelled',
    3: 'status-completed',
    4: 'status-discounted'
  };
  
  return statusClassMap[status] || 'status-unknown';
};

// 查看订单详情
const viewOrderDetail = (tradeNo) => {
  router.push({
    path: '/payment',
    query: { trade_no: tradeNo, from: 'orders' }
  });
};

// 显示取消确认弹窗
const showCancelConfirm = (tradeNo) => {
  currentTradeNo.value = tradeNo;
  showConfirmModal.value = true;
};

// 关闭确认弹窗
const closeConfirmModal = () => {
  showConfirmModal.value = false;
};

// 确认取消订单
const confirmCancelOrder = async () => {
  if (!currentTradeNo.value || canceling.value) return;
  
  canceling.value = true;
  
  try {
    // 尝试取消订单
    await cancelOrder(currentTradeNo.value);
    
    // 立即显示成功消息
    if ($toast && typeof $toast.success === 'function') {
      $toast.success(t('orders.cancelSuccess') || '订单已取消');
    }
    
    // 关闭弹窗
    closeConfirmModal();
    
    // 后台刷新订单列表
    fetchOrders();
  } catch (err) {
    // 安全地记录错误
    console.error('取消订单失败, 错误对象:', err);
    
    // 安全地提取错误消息
    let errorMessage = t('orders.cancelFailed') || '取消订单失败';
    
    try {
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
        } else if (typeof err.message === 'string') {
          errorMessage = err.message;
        }
      }
    } catch (e) {
      console.error('错误处理过程中出现问题:', e);
    }
    
    // 安全地显示错误信息
    if ($toast && typeof $toast.error === 'function') {
      $toast.error(errorMessage);
    } else {
      alert(errorMessage);
    }
    
    // 关闭弹窗
    closeConfirmModal();
  } finally {
    canceling.value = false;
  }
};

// 表头文本和常用文本 - 使用计算属性确保在语言变化时能更新
const headerTexts = computed(() => {
  return {
    tradeNo: t('orders.tradeNo', '订单号'),
    createdAt: t('orders.createdAt', '创建时间'),
    cycle: t('orders.cycle', '周期'),
    totalAmount: t('orders.totalAmount', '金额'),
    statusLabel: t('orders.statusLabel', '状态') || '状态',
    actions: t('orders.actions', '操作'),
    viewDetail: t('orders.viewDetail', '查看详情'),
    cancel: t('orders.cancel', '取消订单'),
    noOrders: t('orders.noOrders', '暂无订单'),
    goShopping: t('orders.goShopping', '去购买套餐'),
    loading: t('orders.loading', '正在加载订单...'),
    cancelConfirmTitle: t('orders.cancelConfirmTitle', '确认取消订单'),
    cancelConfirmText: t('orders.cancelConfirmText', '您确定要取消此订单吗？此操作无法撤销。')
  };
});

// 获取货币符号
const fetchCurrencySymbol = async () => {
  try {
    const response = await getCommConfig();
    if (response && response.data && response.data.currency_symbol) {
      currencySymbol.value = response.data.currency_symbol;
    }
  } catch (error) {
    console.error('获取货币符号失败:', error);
  }
};

// 组件挂载时获取订单
onMounted(() => {
  fetchCurrencySymbol();
  fetchOrders();
  checkMobileView();
});

// 监听语言变化
watch(locale, () => {
  // 不再重新请求数据，只是强制视图更新
  // 通过浅拷贝orders数组触发视图更新
  if (orders.value.length > 0) {
    orders.value = [...orders.value];
  }
});
</script>

<style lang="scss" scoped>
.orders-container {
  padding: 1.25rem;
  padding-bottom: calc(1.25rem + 64px); /* 为底部导航栏预留空间 */
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 3rem; /* 桌面版底部空间 */
  }
}

.orders-inner {
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

/* 订单列表内容 */
.orders-content {
  width: 100%;
  margin: 0 auto;
}

.order-table-container {
  overflow-x: auto; /* 在小屏幕上允许水平滚动 */
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
}

.order-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed; /* 使用固定布局以确保列宽正确 */
  
  th, td {
    padding: 1rem;
    text-align: left;
    word-break: break-all; /* 防止长文本溢出 */
    overflow: hidden;
  }
  
  th {
    background-color: rgba(var(--theme-color-rgb), 0.05);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
    position: sticky;
    top: 0;
    z-index: 10;
    
    &:first-child {
      border-top-left-radius: 12px;
    }
    
    &:last-child {
      border-top-right-radius: 12px;
    }
  }
  
  tbody tr {
    border-bottom: 1px solid var(--border-color);
    transition: all 0.2s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.05);
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .trade-no {
    font-size: 0.9rem;
    color: var(--text-color);
  }
  
  .amount {
    font-weight: 600;
    color: #f44336;
  }
  
  .status-badge {
    display: inline-block;
    padding: 0.35rem 0.75rem;
    border-radius: 5px; /* 将圆角减小为5px */
    font-size: 0.85rem;
    font-weight: 500;
    
    &.status-pending {
      background-color: rgba(255, 152, 0, 0.1);
      color: #ff9800;
    }
    
    &.status-processing {
      background-color: rgba(33, 150, 243, 0.1);
      color: #2196f3;
    }
    
    &.status-cancelled {
      background-color: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }
    
    &.status-completed {
      background-color: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }
    
    &.status-discounted {
      background-color: rgba(156, 39, 176, 0.1);
      color: #9c27b0;
    }
    
    &.status-unknown {
      background-color: rgba(158, 158, 158, 0.1);
      color: #9e9e9e;
    }
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    
    .action-button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      
      &.view-button {
        background-color: rgba(var(--theme-color-rgb), 0.1);
        color: var(--theme-color);
        
        &:hover:not(.disabled) {
          background-color: rgba(var(--theme-color-rgb), 0.2);
          transform: translateY(-2px);
        }
      }
      
      &.cancel-button {
        background-color: rgba(244, 67, 54, 0.1);
        color: #f44336;
        
        &:hover:not(.disabled) {
          background-color: rgba(244, 67, 54, 0.2);
          transform: translateY(-2px);
        }
      }
      
      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
    }
  }
}

/* 加载、错误和空状态 */
.orders-loading, 
.orders-error, 
.orders-empty {
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

.retry-button,
.shop-button {
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

/* 添加弹窗过渡效果 */
.modal-fade-enter-active {
  animation: fade-in 0.2s ease-out;
}

.modal-fade-leave-active {
  animation: fade-out 0.2s ease-in;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.modal-content {
  background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
  }
}

.modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
  }
  
  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
    }
  }
}

.modal-body {
  padding: 1.5rem;
  
  p {
    margin: 0 0 1.5rem;
    color: var(--text-color);
  }
  
  .trade-no-info {
    background-color: rgba(var(--theme-color-rgb), 0.05);
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .trade-no {
      font-weight: 600;
      color: var(--theme-color);
    }
  }
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  
  button {
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &.btn-cancel {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
    
    &.btn-confirm {
      background-color: #f44336;
      border: none;
      color: white;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      &:hover {
        background-color: #d32f2f;
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .loader {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
      }
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .order-table {
    th, td {
      padding: 0.75rem 0.5rem;
    }
    
    .actions {
      .action-button {
        padding: 0.3rem 0.5rem;
        font-size: 0.75rem;
        
        span {
          display: none; /* 在小屏幕上隐藏按钮文字，只显示图标 */
        }
      }
    }
  }
}

/* 分页样式 */
.pagination-container {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
}

.pagination {
  display: flex;
  align-items: center;
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  
  .page-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background-color: transparent;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover:not(.disabled) {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .page-info {
    margin: 0 1rem;
    font-size: 0.9rem;
    color: var(--text-color);
  }
}

/* 分页切换效果 - 根据滑动方向显示不同的动画效果 */
// 左滑动画 - 从右到左
.page-switch-enter-active,
.page-switch-leave-active {
  transition: all 0.3s ease;
}

// 向左滑动时的进入动画（新内容从右侧进入）
.page-switch-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

// 向左滑动时的离开动画（当前内容向左离开）
.page-switch-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

// 右滑动画 - 添加额外的样式类
.page-switch-right-enter-active,
.page-switch-right-leave-active {
  transition: all 0.3s ease;
}

// 向右滑动时的进入动画（新内容从左侧进入）
.page-switch-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

// 向右滑动时的离开动画（当前内容向右离开）
.page-switch-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 确保表格在移动设备上的手势友好性 */
@media (max-width: 768px) {
  .order-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* 增强iOS的滚动体验 */
    cursor: grab;
    
    &:active {
      cursor: grabbing;
    }
  }
}

/* 移动端卡片视图样式 */
.order-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
}

.order-card-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(var(--theme-color-rgb), 0.03);
  
  .order-number {
    display: flex;
    flex-direction: column;
    
    .label {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
    
    .value {
      font-size: 0.9rem;
      font-weight: 500;
      word-break: break-all;
    }
  }
}

.order-card-body {
  padding: 0.75rem 1rem;
  
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(var(--border-color-rgb), 0.5);
    
    &:last-child {
      border-bottom: none;
    }
    
    .label {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    
    .value {
      font-size: 0.9rem;
      text-align: right;
      
      &.amount {
        font-weight: 600;
        color: #f44336;
      }
    }
  }
}

.order-card-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background-color: rgba(var(--theme-color-rgb), 0.02);
  
  .action-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    
    &.view-button {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
      
      &:hover:not(.disabled) {
        background-color: rgba(var(--theme-color-rgb), 0.2);
        transform: translateY(-2px);
      }
    }
    
    &.cancel-button {
      background-color: rgba(244, 67, 54, 0.1);
      color: #f44336;
      
      &:hover:not(.disabled) {
        background-color: rgba(244, 67, 54, 0.2);
        transform: translateY(-2px);
      }
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}

/* 滑动提示样式 */
.swipe-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
  
  .swipe-icon {
    color: var(--theme-color);
    animation: swipe-animation 1.5s infinite alternate;
  }
  
  @keyframes swipe-animation {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(3px);
    }
  }
}
</style> 