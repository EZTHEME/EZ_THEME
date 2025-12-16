<!-- 移动端工单页面 -->
<template>
  <div class="mobile-ticket-container">
    <!-- 大屏幕提示 -->
    <div v-if="isLargeScreen" class="screen-size-notice">
      <div class="notice-content">
        <IconDeviceDesktop :size="48" />
        <h2>{{ $t('tickets.largeScreenNotice') }}</h2>
        <p>{{ $t('tickets.switchToDesktop') }}</p>
        <button class="switch-btn" @click="switchToDesktopView">
          {{ $t('tickets.switchToDesktopView') }}
        </button>
      </div>
    </div>

    <template v-else>
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('tickets.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('tickets.description') }}</p>
        </div>
      </div>

      <!-- 工单列表 -->
      <div class="ticket-list" v-if="!selectedTicket">
        <!-- 创建工单按钮 -->
        <div class="create-ticket-wrapper">
          <button class="new-ticket-btn" @click="showCreateTicketModal">
            <IconPlus :size="18" />
            {{ $t('tickets.newTicket') }}
          </button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <LoadingSpinner />
          <p>{{ $t('tickets.loadingTickets') }}</p>
        </div>

        <!-- 工单列表内容 -->
        <div v-else-if="tickets.length > 0" class="tickets-content">
          <div 
            v-for="ticket in tickets" 
            :key="ticket.id" 
            class="ticket-item"
            @click="selectTicket(ticket)"
          >
            <div class="ticket-header">
              <span class="ticket-subject">{{ ticket.subject }}</span>
              <span :class="['ticket-status', `status-${ticket.status}`]">
                {{ ticket.status === 0 ? $t('tickets.statusOpen') : $t('tickets.statusClosed') }}
              </span>
            </div>
            <div class="ticket-info">
              <span class="ticket-time">{{ formatDate(ticket.created_at) }}</span>
              <span class="ticket-id">#{{ ticket.id }}</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <IconTicket :size="48" />
          <p>{{ $t('tickets.noTickets') }}</p>
          <button class="create-ticket-btn" @click="showCreateTicketModal">
            {{ $t('tickets.createNew') }}
          </button>
        </div>
      </div>

      <!-- 工单详情 -->
      <div v-else class="ticket-detail">
        <!-- 详情页头部 -->
        <div class="detail-header">
          <button class="back-btn" @click="backToList">
            <IconArrowLeft :size="20" />
          </button>
          <div class="ticket-info">
            <h2>{{ selectedTicket.subject }}</h2>
            <div class="meta-info">
              <span :class="['status-badge', `status-${selectedTicket.status}`]">
                {{ selectedTicket.status === 0 ? $t('tickets.statusOpen') : $t('tickets.statusClosed') }}
              </span>
              <span :class="['level-badge', `level-${selectedTicket.level}`]">
                {{ getPriorityLabel(selectedTicket.level) }}
              </span>
            </div>
          </div>
          <button 
            v-if="selectedTicket.status === 0"
            class="close-ticket-btn"
            @click="showCloseConfirm"
          >
            <IconX :size="16" />
          </button>
        </div>

        <!-- 消息列表 -->
        <div class="messages-container">
          <div v-if="loadingMessages" class="loading-state">
            <LoadingSpinner />
            <p>{{ $t('tickets.loadingMessages') }}</p>
          </div>
          
          <div v-else-if="ticketMessages.length === 0" class="empty-messages">
            <IconMessageCircle :size="48" />
            <p>{{ $t('tickets.noMessages') }}</p>
          </div>
          
          <div v-else class="message-list">
            <div 
              v-for="message in ticketMessages" 
              :key="message.id"
              :class="[
                'message-item',
                message.is_admin ? 'admin-message' : 'user-message'
              ]"
            >
              <div class="message-avatar">
                <IconHeadset v-if="message.is_admin" />
                <IconUser v-else />
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">
                    {{ message.is_admin ? $t('tickets.admin') : $t('tickets.you') }}
                  </span>
                  <span class="message-time">{{ formatTimeShort(message.created_at) }}</span>
                </div>
                <div class="message-text">{{ message.message }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 回复框 -->
        <div v-if="selectedTicket.status === 0" class="reply-box">
          <textarea 
            v-model="replyMessage" 
            :placeholder="$t('tickets.replyPlaceholder')"
            rows="3"
            @keydown.ctrl.enter="sendReply"
          ></textarea>
          <button 
            class="send-btn" 
            @click="sendReply"
            :disabled="!replyMessage.trim() || sendingReply"
          >
            <span v-if="sendingReply" class="loader"></span>
            <IconSend v-else :size="18" />
            {{ $t('tickets.send') }}
          </button>
        </div>
        
        <div v-else class="ticket-closed-notice">
          <IconLock :size="20" />
          <span>{{ $t('tickets.ticketClosed') }}</span>
        </div>
      </div>
    </template>

    <!-- 创建工单模态框 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('tickets.createNew') }}</h3>
          <button class="close-btn" @click="closeModal">
            <IconX :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('tickets.subject') }}</label>
            <input 
              type="text" 
              v-model="newTicket.subject" 
              :placeholder="$t('tickets.subjectPlaceholder')"
            />
          </div>
          <div class="form-group">
            <label>{{ $t('tickets.level') }}</label>
            <div class="priority-selector">
              <button 
                v-for="level in [0, 1, 2]" 
                :key="level"
                :class="['priority-btn', { active: newTicket.level === level }]"
                @click="newTicket.level = level"
              >
                {{ getPriorityLabel(level) }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>{{ $t('tickets.message') }}</label>
            <textarea 
              v-model="newTicket.message" 
              :placeholder="$t('tickets.messagePlaceholder')"
              rows="4"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModal">
            {{ $t('common.cancel') }}
          </button>
          <button 
            class="submit-btn" 
            @click="submitTicket"
            :disabled="submitting"
          >
            <span v-if="submitting" class="loader"></span>
            {{ $t('common.submit') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 关闭工单确认弹窗 -->
    <div v-if="showCloseTicketModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('tickets.closeConfirmTitle') }}</h3>
          <button class="close-btn" @click="closeConfirmModal">
            <IconX :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <p>{{ $t('tickets.closeConfirmText') }}</p>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeConfirmModal">
            {{ $t('common.cancel') }}
          </button>
          <button 
            class="confirm-close-btn danger" 
            @click="closeSelectedTicket"
            :disabled="closingTicket"
          >
            <span v-if="!closingTicket">{{ $t('tickets.closeTicket') }}</span>
            <span v-else class="btn-loading">
              <span class="spinner"></span>
              {{ $t('tickets.closing') }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 工单弹窗 -->
    <TicketPopup
      :show-popup="showTicketPopup"
      :title="ticketPopupCfg.title"
      :content="ticketPopupCfg.content"
      :cooldown-hours="ticketPopupCfg.cooldownHours"
      :close-wait-seconds="ticketPopupCfg.closeWaitSeconds"
      @close="handleTicketPopupClose"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { 
  IconPlus, 
  IconTicket,
  IconX,
  IconArrowLeft,
  IconMessageCircle,
  IconHeadset,
  IconUser,
  IconSend,
  IconLock,
  IconDeviceDesktop
} from '@tabler/icons-vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { useToast } from '@/composables/useToast';
import { fetchTicketList, createTicket, getTicketDetail, replyTicket, closeTicket } from '@/api/ticket';
import { getUserInfo, getIpLocationInfo, getCommConfig, getUserSubscribe } from '@/api/user';
import { formatUserInfoForTicket } from '@/utils/formatters';
import { TICKET_CONFIG } from '@/utils/baseConfig';
import TicketPopup from '@/components/ticket/TicketPopup.vue';

const { t } = useI18n();
const { showToast } = useToast();
const router = useRouter();

// 状态变量
const loading = ref(false);
const tickets = ref([]);
const showModal = ref(false);
const submitting = ref(false);
const selectedTicket = ref(null);
const ticketMessages = ref([]);
const loadingMessages = ref(false);
const replyMessage = ref('');
const sendingReply = ref(false);
const showCloseTicketModal = ref(false);
const closingTicket = ref(false);
const refreshInterval = ref(null); // 新增：自动刷新工单详情的定时器

// 新工单表单
const newTicket = ref({
  subject: '',
  message: '',
  level: 0
});

// 添加大屏幕检测
const isLargeScreen = ref(false);

// 工单弹窗相关
const showTicketPopup = ref(false);
const ticketPopupCfg = TICKET_CONFIG?.popup || {};

const checkScreenSize = () => {
  isLargeScreen.value = window.innerWidth >= 905;
};

// 切换到桌面端视图
const switchToDesktopView = () => {
  router.push('/tickets');
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  fetchTickets();

  // 检查弹窗
  checkTicketPopup();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  // 组件卸载时清除定时器
  clearRefreshInterval();
});

// 获取优先级标签
const getPriorityLabel = (level) => {
  const labels = {
    0: t('tickets.levelLow'),
    1: t('tickets.levelMedium'),
    2: t('tickets.levelHigh')
  };
  return labels[level] || labels[0];
};

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// 格式化时间（短格式）
const formatTimeShort = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && 
                  date.getMonth() === now.getMonth() && 
                  date.getFullYear() === now.getFullYear();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

// 显示创建工单模态框
const showCreateTicketModal = () => {
  showModal.value = true;
};

// 关闭模态框
const closeModal = () => {
  // 添加关闭动画
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.classList.add('closing');
    setTimeout(() => {
      showModal.value = false;
      newTicket.value = {
        subject: '',
        message: '',
        level: 0
      };
    }, 300); // 等待动画完成
  } else {
    showModal.value = false;
    newTicket.value = {
      subject: '',
      message: '',
      level: 0
    };
  }
};

// 获取工单详情
const fetchTicketDetail = async (ticketId, isAutoRefresh = false) => {
  if (!isAutoRefresh) {
    loadingMessages.value = true;
    ticketMessages.value = [];
  }
  
  try {
    const data = await getTicketDetail(ticketId);
    if (data.data) {
      // 处理工单消息
      if (data.data.message && Array.isArray(data.data.message)) {
        ticketMessages.value = data.data.message.map(msg => ({
          ...msg,
          // 添加is_admin属性用于前端显示（is_me表示是否是用户自己的消息）
          // 统一处理所有面板类型，is_admin表示"不是用户自己的消息"
          is_admin: !msg.is_me
        }));
      } else {
        ticketMessages.value = [];
      }
      
      // 更新选中的工单状态
      if (selectedTicket.value && selectedTicket.value.id === ticketId) {
        // 如果工单状态已更新，更新selectedTicket中的状态
        if (data.data.status !== undefined) {
          selectedTicket.value.status = data.data.status;
          
          // 如果工单已关闭，清除自动刷新定时器
          if (data.data.status === 1) {
            clearRefreshInterval();
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch ticket details:', error);
    showToast(error.response?.message || error.message || t('tickets.fetchDetailError'), 'error');
  } finally {
    // 只有非自动刷新时才重置加载状态
    if (!isAutoRefresh) {
      loadingMessages.value = false;
    }
  }
};

// 清除自动刷新定时器
const clearRefreshInterval = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
};

// 设置自动刷新定时器
const setupRefreshInterval = (ticketId) => {
  // 先清除可能存在的定时器
  clearRefreshInterval();
  
  // 如果工单未关闭，设置定时器每5秒刷新一次
  if (selectedTicket.value && selectedTicket.value.status === 0) {
    refreshInterval.value = setInterval(() => {
      if (selectedTicket.value && selectedTicket.value.id === ticketId) {
        // 传入true表示这是自动刷新，不显示加载动画
        fetchTicketDetail(ticketId, true);
      } else {
        // 如果选中的工单已更改，清除定时器
        clearRefreshInterval();
      }
    }, 5000); // 5秒刷新一次
  }
};

// 选择工单
const selectTicket = async (ticket) => {
  // 清除之前的定时器
  clearRefreshInterval();
  
  selectedTicket.value = ticket;
  await fetchTicketDetail(ticket.id);
  
  // 设置自动刷新（仅当工单未关闭时）
  if (ticket.status === 0) {
    setupRefreshInterval(ticket.id);
  }
};

// 返回工单列表
const backToList = () => {
  // 清除自动刷新定时器
  clearRefreshInterval();
  
  // 添加关闭动画
  const detailElement = document.querySelector('.ticket-detail');
  if (detailElement) {
    detailElement.classList.add('closing');
    setTimeout(() => {
      selectedTicket.value = null;
    }, 280); // 等待动画接近完成
  } else {
    selectedTicket.value = null;
  }
};

// 获取工单列表
const fetchTickets = async () => {
  loading.value = true;
  try {
    const result = await fetchTicketList();
    tickets.value = Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    showToast(error.response?.message || error.message || t('tickets.fetchError'), 'error');
  } finally {
    loading.value = false;
  }
};

// 发送回复
const sendReply = async () => {
  if (!replyMessage.value.trim() || !selectedTicket.value || sendingReply.value) return;
  
  sendingReply.value = true;
  try {
    const data = await replyTicket(selectedTicket.value.id, replyMessage.value);
    
    if (data.data) {
      showToast(data.message || t('tickets.replySent'), 'success');
      replyMessage.value = '';
      
      // 传入true参数表示这是自动刷新，不显示加载动画
      await fetchTicketDetail(selectedTicket.value.id, true);
      // 不再调用 fetchTickets() 避免整页刷新
    }
  } catch (error) {
    console.error('Failed to send reply:', error);
    showToast(error.response?.message || error.message || t('tickets.replyError'), 'error');
  } finally {
    sendingReply.value = false;
  }
};

// 显示关闭工单确认框
const showCloseConfirm = () => {
  showCloseTicketModal.value = true;
};

// 关闭确认框
const closeConfirmModal = () => {
  // 添加关闭动画
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.classList.add('closing');
    setTimeout(() => {
      showCloseTicketModal.value = false;
      closingTicket.value = false;
    }, 300); // 等待动画完成
  } else {
    showCloseTicketModal.value = false;
    closingTicket.value = false;
  }
};

// 关闭工单
const closeSelectedTicket = async () => {
  if (!selectedTicket.value) return;
  
  closingTicket.value = true;
  try {
    const data = await closeTicket(selectedTicket.value.id);
    
    if (data.data === true) {
      showToast(data.message || t('tickets.closeSuccess'), 'success');
      showCloseTicketModal.value = false;
      
      // 设置工单状态为已关闭
      selectedTicket.value.status = 1;
      
      // 重新获取工单列表
      await fetchTickets();
      
      // 清除自动刷新定时器，因为工单已关闭
      clearRefreshInterval();
      
      // 返回工单列表
      backToList();
    }
  } catch (error) {
    console.error('Failed to close ticket:', error);
    showToast(error.response?.message || error.message || t('tickets.closeError'), 'error');
  } finally {
    closingTicket.value = false;
  }
};

// 提交工单
const submitTicket = async () => {
  if (!newTicket.value.subject || !newTicket.value.message) {
    showToast(t('tickets.formIncomplete'), 'error');
    return;
  }

  submitting.value = true;

  try {
    let messageContent = newTicket.value.message;
    
    // 根据配置决定是否添加用户信息
    if (TICKET_CONFIG.includeUserInfoInTicket) {
      // 获取用户信息、货币配置、订阅信息和IP位置信息
      const [userInfoResponse, commConfigResponse, subscribeResponse, ipInfoResponse] = await Promise.all([
        getUserInfo(),
        getCommConfig(),
        getUserSubscribe(),
        getIpLocationInfo()
      ]);
      
      // 将货币符号信息添加到userInfoResponse中
      if (commConfigResponse && commConfigResponse.data && commConfigResponse.data.currency_symbol) {
        userInfoResponse.currency_symbol = commConfigResponse.data.currency_symbol;
      }
      
      // 格式化用户信息和IP位置信息
      const userInfoText = formatUserInfoForTicket(
        userInfoResponse, 
        ipInfoResponse,
        subscribeResponse // 添加订阅信息参数
      );
      
      // 将用户信息添加到工单内容中
      messageContent = `${newTicket.value.message}\n\n${userInfoText}`;
    }
    
    const data = await createTicket({
      subject: newTicket.value.subject,
      message: messageContent,
      level: parseInt(newTicket.value.level)
    });
    
    if (data.data) {
      showToast(data.message || t('tickets.createSuccess'), 'success');
      closeModal();
      
      // 刷新工单列表
      await fetchTickets();
      
      // 清空表单数据
      newTicket.value = {
        subject: '',
        message: '',
        level: '0'
      };
    }
  } catch (error) {
    console.error('Failed to create ticket:', error);
    showToast(error.response?.message || error.message || t('tickets.createError'), 'error');
  } finally {
    submitting.value = false;
  }
};

// 检查弹窗
const checkTicketPopup = () => {
  if (!ticketPopupCfg.enabled) return;
  const lastClose = Number(localStorage.getItem('ticket_popup_close_time') || 0);
  const cooldownMs = (ticketPopupCfg.cooldownHours || 0) * 3600 * 1000;
  if (!lastClose || Date.now() - lastClose >= cooldownMs) {
    showTicketPopup.value = true;
  }
};

const handleTicketPopupClose = () => {
  showTicketPopup.value = false;
};

// 组件挂载时获取工单列表
fetchTickets();
</script>

<style lang="scss" scoped>
.mobile-ticket-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  padding-bottom: 90px; /* 为底部菜单留出空间 */
  position: relative;
}

// 添加dashboard风格的卡片样式
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

// 创建工单按钮容器
.create-ticket-wrapper {
  padding: 0;
  margin-bottom: 1.5rem;
  background-color: var(--theme-color);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.2);
  margin: 0 0 1.5rem;
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.3);
  }

  .new-ticket-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.85rem;
    background-color: transparent;
    color: white;
    border: none;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    &:active {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }
}

.search-bar {
  display: none;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
  margin: 1rem 0;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px dashed var(--border-color);

  p {
    margin: 1.25rem 0;
    font-size: 1rem;
    line-height: 1.5;
  }

  .create-ticket-btn {
    margin-top: 1rem;
    padding: 0.75rem 1.75rem;
    border-radius: 8px;
    background-color: var(--theme-color);
    color: white;
    border: none;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.2);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.9);
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.tickets-content {
  padding: 0;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.ticket-item {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);

  &:hover {
    border-color: var(--theme-color);
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  &:active {
    transform: translateY(-1px);
  }

  .ticket-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;

    .ticket-subject {
      font-weight: 600;
      color: var(--text-color);
      flex: 1;
      margin-right: 1rem;
      font-size: 1rem;
      line-height: 1.4;
    }

    .ticket-status {
      font-size: 0.8rem;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-weight: 500;
      white-space: nowrap;

      &.status-0 {
        background-color: rgba(76, 175, 80, 0.1);
        color: #4caf50;
      }

      &.status-1 {
        background-color: rgba(158, 158, 158, 0.1);
        color: #9e9e9e;
      }
    }
  }

  .ticket-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-muted);
    padding-top: 0.5rem;
    border-top: 1px dashed rgba(var(--border-color-rgb), 0.5);
  }
}

.ticket-detail {
  padding-top: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--card-background, rgba(30, 30, 30, 0.8));
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  animation: slideInRight 0.3s ease;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  
  &.closing {
    animation: slideOutRight 0.3s ease forwards;
  }
}

.detail-header {
  padding: 1rem;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
  margin-top: 70px; /* 为顶栏留出空间 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  .back-btn {
    background: none;
    border: none;
    color: var(--text-color);
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    animation: fadeInLeft 0.4s ease;

    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
    }
  }

  .ticket-info {
    flex: 1;
    min-width: 0;

    h2 {
      margin: 0;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
      color: var(--text-color);
    }

    .meta-info {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }

  .close-ticket-btn {
    background: none;
    border: none;
    color: #f44336;
    padding: 0.5rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    &:hover {
      background-color: rgba(244, 67, 54, 0.1);
    }
  }
}

.status-badge, 
.level-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge {
  &.status-0 {
    background-color: rgba(76, 175, 80, 0.1);
    color: #4caf50;
  }
  
  &.status-1 {
    background-color: rgba(158, 158, 158, 0.1);
    color: #9e9e9e;
  }
}

.level-badge {
  &.level-0 {
    background-color: rgba(33, 150, 243, 0.1);
    color: #2196f3;
  }
  
  &.level-1 {
    background-color: rgba(255, 152, 0, 0.1);
    color: #ff9800;
  }
  
  &.level-2 {
    background-color: rgba(244, 67, 54, 0.1);
    color: #f44336;
  }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  background-color: var(--card-background, rgba(30, 30, 30, 0.8));

  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
    color: var(--text-color);
    margin: 1rem 0;
    background-color: var(--card-bg);
    border-radius: 12px;
    border: 1px dashed var(--border-color);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

    p {
      margin: 1.25rem 0;
      font-size: 1rem;
      line-height: 1.5;
      color: var(--text-muted);
    }
  }
}

.empty-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 2.5rem;
  text-align: center;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px dashed var(--border-color);
  margin: 1rem 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  .icon {
    margin-bottom: 1.25rem;
    opacity: 0.7;
  }

  p {
    font-size: 1rem;
    line-height: 1.5;
  }
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 1rem;
  margin-top: 0.5rem;
}

.message-item {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
  animation: fadeInUp 0.4s ease;

  &.admin-message {
    align-self: flex-start;

    .message-content {
      background-color: var(--card-bg);
      border-radius: 0 12px 12px 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .message-avatar {
      background-color: #f44336;
    }
  }

  &.user-message {
    align-self: flex-end;
    flex-direction: row-reverse;

    .message-content {
      background-color: var(--theme-color);
      color: white;
      border-radius: 12px 0 12px 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

      .message-header {
        .sender-name,
        .message-time {
          color: rgba(255, 255, 255, 0.9);
        }
      }
    }

    .message-avatar {
      background-color: var(--theme-color);
    }
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.message-content {
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;

    .sender-name {
      font-weight: 600;
    }

    .message-time {
      color: var(--text-muted);
    }
  }

  .message-text {
    font-size: 0.95rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.reply-box {
  padding: 1.25rem;
  background-color: var(--card-bg);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 80px; /* 为底部菜单留出空间 */
  position: relative;
  z-index: 5;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  textarea {
    width: 100%;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background-color: var(--bg-secondary);
    color: var(--text-color);
    font-size: 0.95rem;
    resize: none;
    transition: all 0.3s ease;
    min-height: 100px;

    &:focus {
      outline: none;
      border-color: var(--theme-color);
      box-shadow: 0 2px 8px rgba(var(--theme-color-rgb), 0.1);
    }
  }

  .send-btn {
    align-self: flex-end;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    background-color: var(--theme-color);
    color: white;
    border: none;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.2);

    &:hover:not(:disabled) {
      background-color: rgba(var(--theme-color-rgb), 0.9);
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.3);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .loader {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }
  }
}

.ticket-closed-notice {
  padding: 1.25rem;
  background-color: var(--card-bg);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 80px; /* 为底部菜单留出空间 */
  position: relative;
  z-index: 5;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
  padding: 1rem;
}

.modal-content {
  width: 90%;
  max-width: 500px;
  background-color: var(--card-background);
  border-radius: 16px;
  overflow: hidden;
  animation: slideIn 0.3s ease;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  
  &.closing {
    animation: slideOut 0.3s ease forwards;
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-color);

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
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

.modal-body {
  padding: 1.5rem;
  background-color: var(--bg-color);

  p {
    color: var(--text-color);
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 500;
      color: var(--text-color);
      font-size: 1rem;
    }

    input,
    textarea {
      width: 100%;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background-color: var(--card-bg);
      color: var(--text-color);
      font-size: 1rem;
      transition: all 0.3s ease;

      &:focus {
        outline: none;
        border-color: var(--theme-color);
        box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.1);
      }

      &::placeholder {
        color: var(--text-muted);
      }
    }

    textarea {
      resize: vertical;
      min-height: 140px;
    }
  }

  .priority-selector {
    display: flex;
    gap: 0.75rem;

    .priority-btn {
      flex: 1;
      padding: 0.85rem;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background-color: var(--card-bg);
      color: var(--text-color);
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      font-size: 0.95rem;

      &.active {
        background-color: var(--theme-color);
        color: white;
        border-color: var(--theme-color);
        box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.25);
      }

      &:hover:not(.active) {
        background-color: var(--bg-color);
        border-color: var(--theme-color);
        color: var(--theme-color);
      }
    }
  }
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background-color: var(--bg-color);

  button {
    padding: 0.85rem 1.75rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &.cancel-btn {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      color: var(--text-color);

      &:hover {
        background-color: var(--bg-secondary);
        border-color: var(--text-muted);
      }
    }

    &.submit-btn {
      background-color: var(--theme-color);
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.25);

      &:hover:not(:disabled) {
        background-color: rgba(var(--theme-color-rgb), 0.9);
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.3);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .loader {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 添加动画关键帧
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(30px);
    opacity: 0;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadeInLeft {
  from {
    transform: translateX(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// 添加大屏幕提示样式
.screen-size-notice {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
  z-index: 1000;
  padding: 1.5rem;
  animation: fadeIn 0.4s ease;

  .notice-content {
    text-align: center;
    background-color: var(--card-bg);
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    max-width: 90%;
    width: 450px;
    border: 1px solid var(--border-color);
    animation: scaleIn 0.5s ease;

    h2 {
      margin: 1.25rem 0;
      font-size: 1.5rem;
      color: var(--text-color);
      font-weight: 600;
    }

    p {
      color: var(--text-muted);
      margin-bottom: 2rem;
      font-size: 1.05rem;
      line-height: 1.6;
    }

    .switch-btn {
      padding: 0.85rem 1.75rem;
      border-radius: 10px;
      background-color: var(--theme-color);
      color: white;
      border: none;
      font-size: 1.05rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.25);

      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.9);
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.35);
      }

      &:active {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.25);
      }
    }
  }
}

.confirm-close-btn.danger {
  background-color: #f44336;
  color: white;
  border: none;
  
  &:hover {
    background-color: #d32f2f;
  }
  
  &:disabled {
    background-color: #fbb4af;
    cursor: not-allowed;
  }
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s linear infinite;
    margin-right: 4px;
  }
}
</style> 