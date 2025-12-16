<template>
  <div class="profile-container">
    <div class="profile-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('profile.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('common.welcome') }}</p>
        </div>
      </div>
      
      <!-- 骨架屏加载状态 -->
      <div v-if="loading" class="profile-skeleton">
        <!-- 基本信息骨架屏 -->
        <div class="profile-card">
          <div class="card-header">
            <div class="skeleton-line skeleton-title"></div>
          </div>
          <div class="skeleton-content">
            <div class="skeleton-item">
              <div class="skeleton-label"></div>
              <div class="skeleton-value"></div>
            </div>
            <div class="skeleton-item">
              <div class="skeleton-label"></div>
              <div class="skeleton-value"></div>
            </div>
          </div>
        </div>
        
        <!-- 设置骨架屏 -->
        <div class="profile-card">
          <div class="card-header">
            <div class="skeleton-line skeleton-title"></div>
          </div>
          <div class="skeleton-content">
            <div class="skeleton-item skeleton-setting">
              <div class="skeleton-text">
                <div class="skeleton-label"></div>
                <div class="skeleton-description"></div>
              </div>
              <div class="skeleton-toggle"></div>
            </div>
            <div class="skeleton-item skeleton-setting">
              <div class="skeleton-text">
                <div class="skeleton-label"></div>
                <div class="skeleton-description"></div>
              </div>
              <div class="skeleton-toggle"></div>
            </div>
          </div>
        </div>
        
        <!-- 按钮骨架屏 -->
        <div class="profile-card">
          <div class="card-header">
            <div class="skeleton-line skeleton-title"></div>
          </div>
          <div class="skeleton-content">
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="error" class="error-state">
        <IconAlertTriangle :size="48" class="error-icon" />
        <p>{{ error }}</p>
        <button class="retry-button" @click="fetchUserInfo">{{ $t('common.retry') }}</button>
      </div>
      
      <div v-else class="profile-content">
        <!-- 基本信息 -->
        <div class="profile-card">
          <div class="card-header">
            <h3>{{ $t('profile.basicInfo') }}</h3>
          </div>
          <div class="info-content">
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">{{ $t('profile.email') }}</span>
                <span class="info-value">{{ userInfo.email }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('profile.createdAt') }}</span>
                <span class="info-value">{{ formatDate(userInfo.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 礼品卡兑换 -->
        <div v-if="PROFILE_CONFIG.showGiftCardRedeem" class="profile-card">
          <div class="card-header">
            <h3>{{ $t('profile.giftCard') }}</h3>
          </div>
          <div class="settings-content">
            <div class="gift-card-form">
              <div class="input-group">
                <input 
                  type="text" 
                  v-model="giftCardCode" 
                  :placeholder="$t('profile.giftCardPlaceholder')"
                  class="gift-card-input"
                />
                <button 
                  class="gift-card-btn" 
                  @click="redeemGiftCard"
                  :disabled="isRedeeming || !giftCardCode"
                >
                  <span v-if="isRedeeming" class="loader"></span>
                  <IconGift v-else :size="18" />
                  {{ $t('profile.giftCardSubmit') }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 邮件提醒设置 -->
        <div class="profile-card">
          <div class="card-header">
            <h3>{{ $t('profile.notifications') }}</h3>
          </div>
          <div class="settings-content">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">{{ $t('profile.expireRemind') }}</span>
                <span class="setting-description">{{ $t('profile.expireRemindDesc') }}</span>
              </div>
              <div class="setting-toggle">
                <label class="switch" :class="{ 'disabled': updatingSettings }">
                  <input type="checkbox" v-model="remindExpire" @change="updateRemindSettings('expire')" :disabled="updatingSettings" />
                  <span class="slider round" :class="{ 'loading': updatingExpire }"></span>
                </label>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">{{ $t('profile.trafficRemind') }}</span>
                <span class="setting-description">{{ $t('profile.trafficRemindDesc') }}</span>
              </div>
              <div class="setting-toggle">
                <label class="switch" :class="{ 'disabled': updatingSettings }">
                  <input type="checkbox" v-model="remindTraffic" @change="updateRemindSettings('traffic')" :disabled="updatingSettings" />
                  <span class="slider round" :class="{ 'loading': updatingTraffic }"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 安全设置 -->
        <div class="profile-card">
          <div class="card-header">
            <h3>{{ $t('profile.security') }}</h3>
          </div>
          <div class="settings-content">
            <div class="action-buttons">
              <button class="action-btn" @click="showPasswordModal = true">
                <IconLock :size="18" />
                {{ $t('profile.changePassword') }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Telegram通信 -->
        <div class="profile-card" v-if="(telegramConfig?.telegram_discuss_link || (telegramBotInfo && telegramBotInfo.username)) && !loadingTelegram">
          <div class="card-header">
            <h3>{{ $t('profile.telegram') }}</h3>
          </div>
          <div class="settings-content">
            <!-- 加载状态 -->
            <div v-if="loadingTelegram" class="telegram-loading">
              <div class="skeleton-wrapper">
                <div class="skeleton-line" style="width: 80%; height: 40px; margin-bottom: 12px;"></div>
                <div class="skeleton-line" style="width: 60%; height: 40px;"></div>
              </div>
            </div>
            
            <!-- 正常状态 -->
            <div class="action-buttons">
              <button class="action-btn" @click="openTelegramGroup" v-if="telegramConfig?.telegram_discuss_link">
                <IconBrandTelegram :size="18" />
                {{ $t('profile.telegramGroup') }}
              </button>
              
              <button class="action-btn" @click="openTelegramBotModal" v-if="telegramBotInfo && telegramBotInfo.username">
                <IconBrandTelegram :size="18" />
                {{ $t('profile.telegramBot') }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 订阅管理 -->
        <div class="profile-card">
          <div class="card-header">
            <h3>{{ $t('profile.subscription') }}</h3>
          </div>
          <div class="settings-content">
            <div class="action-buttons">
              <button class="action-btn danger" @click="showResetModal = true">
                <IconRefresh :size="18" />
                {{ $t('profile.resetSecurity') }}
              </button>
              
              <button v-if="subscriptionUrl" class="action-btn" @click="copySubscriptionUrl">
                <IconCopy :size="18" />
                {{ $t('profile.copySubscription') }}
              </button>
            </div>
            
            <div v-if="subscriptionUrl" class="subscription-info">
              <div class="subscription-url">{{ subscriptionUrl }}</div>
            </div>
          </div>
        </div>

        <!-- 近期登录设备 -->
        <div v-if="PROFILE_CONFIG.showRecentDevices" class="profile-card">
          <div class="card-header">
            <h3>{{ $t('profile.recentDevices') }}</h3>
          </div>
          <div class="settings-content">
            <!-- 加载状态 -->
            <div v-if="loadingSessions" class="device-loading">
              <div class="session-skeleton" v-for="i in 3" :key="i">
                <div class="session-skeleton-icon"></div>
                <div class="session-skeleton-content">
                  <div class="session-skeleton-title"></div>
                  <div class="session-skeleton-info"></div>
                </div>
              </div>
            </div>
            
            <!-- 错误状态 -->
            <div v-else-if="sessionError" class="device-error">
              <p>{{ sessionError }}</p>
              <button class="refresh-btn" @click="fetchActiveSessions">
                {{ $t('common.retry') }}
              </button>
            </div>
            
            <!-- 无数据状态 -->
            <div v-else-if="activeSessions.length === 0" class="device-empty">
              <IconDevices :size="48" class="empty-icon" />
              <p>{{ $t('profile.noDevices') }}</p>
            </div>
            
            <!-- 数据列表 -->
            <div v-else class="device-list">
              <div v-for="(session, index) in activeSessions" :key="index" class="device-item">
                <div class="device-icon">
                  <component :is="getDeviceIcon(session.ua)" :size="24" />
                </div>
                <div class="device-info">
                  <div class="device-name">{{ formatDeviceInfo(session.ua) }}</div>
                  <div class="device-meta">
                    <span class="device-ip">{{ session.ip || $t('profile.unknownIP') }}</span>
                    <span class="device-time">{{ formatTimestamp(session.login_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 修改密码弹窗 -->
      <transition name="modal-fade">
        <div v-if="showPasswordModal" class="modal-overlay" @click="showPasswordModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>{{ $t('profile.changePasswordTitle') }}</h3>
              <button class="modal-close" @click="showPasswordModal = false">
                <IconX :size="20" />
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>{{ $t('profile.oldPassword') }}</label>
                <input 
                  type="password" 
                  v-model="passwordForm.oldPassword"
                  :placeholder="$t('profile.oldPassword')"
                />
              </div>
              <div class="form-group">
                <label>{{ $t('profile.newPassword') }}</label>
                <input 
                  type="password" 
                  v-model="passwordForm.newPassword"
                  :placeholder="$t('profile.newPassword')"
                />
              </div>
              <div class="form-group">
                <label>{{ $t('profile.confirmPassword') }}</label>
                <input 
                  type="password" 
                  v-model="passwordForm.confirmPassword"
                  :placeholder="$t('profile.confirmPassword')"
                />
                <div v-if="passwordMismatch" class="error-text">
                  {{ $t('profile.passwordMismatch') }}
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="showPasswordModal = false">
                {{ $t('common.cancel') }}
              </button>
              <button 
                class="btn-submit" 
                @click="changePassword"
                :disabled="changingPassword || !validatePasswordForm()"
              >
                <span v-if="changingPassword" class="loader"></span>
                {{ $t('common.submit') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- 重置订阅弹窗 -->
      <transition name="modal-fade">
        <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>{{ $t('profile.resetSecurityTitle') }}</h3>
              <button class="modal-close" @click="showResetModal = false">
                <IconX :size="20" />
              </button>
            </div>
            <div class="modal-body">
              <p>{{ $t('profile.resetSecurityConfirm') }}</p>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="showResetModal = false">
                {{ $t('common.cancel') }}
              </button>
              <button 
                class="btn-submit danger" 
                @click="resetSecurity"
                :disabled="resetting"
              >
                <span v-if="resetting" class="loader"></span>
                {{ $t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
    
    <!-- 底部安全区域 -->
    <div class="bottom-safe-area"></div>
  </div>

  <!-- Telegram机器人绑定弹窗 -->
  <transition name="modal-fade">
    <div v-if="showTelegramBotModal" class="modal-overlay" @click="closeTelegramBotModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('profile.bindTelegram') }}</h3>
          <button class="modal-close" @click="closeTelegramBotModal">
            <IconX :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="step-container">
            <div class="step-item">
              <div class="step-number">{{ $t('profile.telegramStep1') }}</div>
              <div class="step-content">
                <p>{{ $t('profile.telegramSearchTip') }}
                  <a :href="`https://t.me/${telegramBotInfo?.username}`" target="_blank" class="tg-link">
                    @{{ telegramBotInfo?.username }}
                  </a>
                </p>
              </div>
            </div>
            
            <div class="step-item">
              <div class="step-number">{{ $t('profile.telegramStep2') }}</div>
              <div class="step-content">
                <p>{{ $t('profile.telegramSendCommand') }}</p>
                <div class="command-container">
                  <pre class="command-text">/bind {{ subscriptionUrl }}</pre>
                  <button class="copy-command-btn" @click="copyCommand">
                    <IconCopy :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-submit" @click="closeTelegramBotModal">
            {{ $t('profile.iKnow') }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup name="UserProfile">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { 
  getUserInfo, 
  changePassword as apiChangePassword, 
  resetSecurity as apiResetSecurity, 
  updateRemindSettings as apiUpdateRemind, 
  redeemGiftCard as apiRedeemGiftCard, 
  getActiveSession, 
  getCommConfig, 
  getTelegramBotInfo,
  getUserSubscribe
} from '@/api/user';
import { formatDate } from '@/utils/formatters';
import { 
  IconAlertTriangle,
  IconLock,
  IconRefresh,
  IconCopy,
  IconX,
  IconGift,
  IconDevices,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconBrowser,
  IconBrandTelegram
} from '@tabler/icons-vue';
import useToast from '@/hooks/useToast';
import { reloadMessages } from '@/i18n';
import { PROFILE_CONFIG } from '@/utils/baseConfig';

// Define component name as multi-word to satisfy ESLint rule
defineOptions({
  name: 'UserProfile'
});

// 强制重新加载国际化文本
reloadMessages();

const { t } = useI18n();
const { success, error: showError } = useToast();

// 状态变量
const loading = ref(true);
const error = ref('');
const userInfo = ref({});
const showPasswordModal = ref(false);
const showResetModal = ref(false);
const changingPassword = ref(false);
const resetting = ref(false);
const remindExpire = ref(false);
const remindTraffic = ref(false);
const subscriptionUrl = ref('');

// Telegram相关状态
const telegramConfig = ref({
  is_telegram: 0,
  telegram_discuss_link: ''
});
const telegramBotInfo = ref(null);
const loadingTelegram = ref(false);
const telegramError = ref('');
const showTelegramBotModal = ref(false);

// 近期登录设备相关
const activeSessions = ref([]);
const loadingSessions = ref(false);
const sessionError = ref('');

// 礼品卡兑换相关
const giftCardCode = ref('');
const isRedeeming = ref(false);

// 邮件提醒设置加载状态
const updatingSettings = ref(false);
const updatingExpire = ref(false);
const updatingTraffic = ref(false);

// 密码表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 密码不匹配错误
const passwordMismatch = computed(() => {
  if (!passwordForm.value.confirmPassword) return false;
  return passwordForm.value.newPassword !== passwordForm.value.confirmPassword;
});

// 验证密码表单
const validatePasswordForm = () => {
  return (
    passwordForm.value.oldPassword && 
    passwordForm.value.newPassword &&
    passwordForm.value.confirmPassword && 
    !passwordMismatch.value
  );
};

// 在setup开始处添加
const route = useRoute();
const router = useRouter();

// 获取用户信息
const fetchUserInfo = async (showLoading = true) => {
  if (showLoading) {
    loading.value = true;
  }
  error.value = '';
  
  try {
    const response = await getUserInfo();
    
    if (response && response.data) {
      userInfo.value = response.data;
      
      // 设置提醒状态
      remindExpire.value = !!response.data.remind_expire;
      remindTraffic.value = !!response.data.remind_traffic;
      
      // 获取订阅链接
      await fetchSubscribeInfo();
    } else {
      error.value = t('common.unknownError');
    }
  } catch (err) {
    console.error('Failed to fetch user info:', err);
    error.value = err?.message || t('common.networkError');
    
    showError(error.value);
  } finally {
    // 在这里不要结束loading状态，等待其他API请求完成
    if (showLoading && !loadingTelegram.value && !loadingSessions.value) {
      loading.value = false;
    }
    
    // 检查URL参数是否需要打开密码修改弹窗
    checkOpenPasswordModal();
  }
};

// 检查URL参数是否需要打开密码修改弹窗
const checkOpenPasswordModal = () => {
  if (route.query.openPasswordModal === 'true') {
    // 延迟0.5秒后打开弹窗，使体验更平滑
    setTimeout(() => {
      showPasswordModal.value = true;
      
      // 移除URL中的参数，防止刷新页面时再次触发弹窗
      const query = { ...route.query };
      delete query.openPasswordModal;
      router.replace({ query });
    }, 500);
  }
};

// 监听路由变化
watch(() => route.query, (newQuery) => {
  if (newQuery.openPasswordModal === 'true') {
    // 延迟0.5秒后打开弹窗，使体验更平滑
    setTimeout(() => {
      showPasswordModal.value = true;
      
      // 移除URL中的参数，防止刷新页面时再次触发弹窗
      const query = { ...newQuery };
      delete query.openPasswordModal;
      router.replace({ query });
    }, 500);
  }
}, { immediate: true });

// 获取订阅信息
const fetchSubscribeInfo = async () => {
  try {
    const response = await getUserSubscribe();
    if (response && response.data) {
      subscriptionUrl.value = response.data.subscribe_url || '';
    }
  } catch (err) {
    console.error('Failed to fetch subscribe info:', err);
    // 错误处理，但不显示错误提示
  }
};

// 获取Telegram相关信息
const fetchTelegramInfo = async () => {
  loadingTelegram.value = true;
  telegramError.value = '';
  
  try {
    // 获取通信配置(含Telegram群组链接)
    const configResponse = await getCommConfig();
    if (configResponse && configResponse.data) {
      telegramConfig.value = configResponse.data;
    }
    
    // 获取Telegram机器人信息
    try {
      const botResponse = await getTelegramBotInfo();
      if (botResponse && botResponse.data) {
        // 检查是否包含错误信息
        if (botResponse.data.message && botResponse.data.message.includes('Not Found')) {
          telegramBotInfo.value = null;
        } else {
          telegramBotInfo.value = botResponse.data;
        }
      }
    } catch (botErr) {
      // Bot获取失败不显示错误，只设置为null
      console.error('Failed to fetch Telegram bot info:', botErr);
      telegramBotInfo.value = null;
    }
  } catch (err) {
    console.error('Failed to fetch Telegram info:', err);
    // 不设置错误信息，让UI正常显示
    telegramConfig.value = null;
    telegramBotInfo.value = null;
  } finally {
    loadingTelegram.value = false;
    // 检查所有API请求是否完成
    if (!loading.value && !loadingSessions.value) {
      loading.value = false;
    }
  }
};

// 打开Telegram群组链接
const openTelegramGroup = () => {
  if (telegramConfig.value && telegramConfig.value.telegram_discuss_link) {
    window.open(telegramConfig.value.telegram_discuss_link, '_blank');
  }
};

// 打开Telegram机器人弹窗
const openTelegramBotModal = () => {
  showTelegramBotModal.value = true;
};

// 关闭Telegram机器人弹窗
const closeTelegramBotModal = () => {
  showTelegramBotModal.value = false;
};

// 复制命令
const copyCommand = () => {
  if (telegramBotInfo.value && subscriptionUrl.value) {
    const command = `/bind ${subscriptionUrl.value}`;
    navigator.clipboard.writeText(command)
      .then(() => {
        success(t('profile.commandCopied'));
      })
      .catch(err => {
        console.error('Failed to copy command:', err);
        error(t('common.copyFailed'));
      });
  }
};

// 更新提醒设置
const updateRemindSettings = async (type) => {
  updatingSettings.value = true;
  
  if (type === 'expire') {
    updatingExpire.value = true;
  } else if (type === 'traffic') {
    updatingTraffic.value = true;
  }
  
  try {
    const data = {
      remind_expire: remindExpire.value ? 1 : 0,
      remind_traffic: remindTraffic.value ? 1 : 0
    };
    
    const response = await apiUpdateRemind(data);
    
    if (response && response.data) {
      success(t('profile.updateSuccess'));
    }
  } catch (err) {
    console.error('Failed to update remind settings:', err);
    
    // 还原状态
    remindExpire.value = !!userInfo.value.remind_expire;
    remindTraffic.value = !!userInfo.value.remind_traffic;
    
    showError(t('profile.updateError'));
  } finally {
    // 无论成功还是失败，都刷新用户信息，但不显示加载状态
    await fetchUserInfo(false);
    
    updatingSettings.value = false;
    updatingExpire.value = false;
    updatingTraffic.value = false;
  }
};

// 修改密码
const changePassword = async () => {
  if (!validatePasswordForm()) return;
  
  changingPassword.value = true;
  
  try {
    const data = {
      old_password: passwordForm.value.oldPassword,
      new_password: passwordForm.value.newPassword
    };
    
    const response = await apiChangePassword(data);
    
    if (response && response.data) {
      success(t('profile.passwordChanged'));
      
      // 清空密码表单并关闭弹窗
      passwordForm.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      
      showPasswordModal.value = false;
    }
  } catch (err) {
    console.error('Failed to change password:', err);
    
    showError(t('profile.passwordError'));
  } finally {
    changingPassword.value = false;
  }
};

// 重置订阅
const resetSecurity = async () => {
  resetting.value = true;
  
  try {
    const response = await apiResetSecurity();
    
    if (response && response.data) {
      subscriptionUrl.value = response.data;
      
      success(t('profile.resetSuccess'));
      
      showResetModal.value = false;
    }
  } catch (err) {
    console.error('Failed to reset security:', err);
    
    showError(t('profile.resetError'));
  } finally {
    resetting.value = false;
  }
};

// 复制订阅链接
const copySubscriptionUrl = () => {
  if (!subscriptionUrl.value) return;
  
  navigator.clipboard.writeText(subscriptionUrl.value)
    .then(() => {
      success(t('profile.subscriptionCopied'));
    })
    .catch(err => {
      console.error('Failed to copy text:', err);
    });
};

// 兑换礼品卡
const redeemGiftCard = async () => {
  if (!giftCardCode.value) {
    showError(t('profile.giftCardEmpty'));
    return;
  }
  
  isRedeeming.value = true;
  
  try {
    const response = await apiRedeemGiftCard(giftCardCode.value);
    
    if (response && response.data) {
      success(t('profile.giftCardSuccess'));
      giftCardCode.value = ''; // 清空输入框
      
      // 刷新用户信息以更新余额等数据
      await fetchUserInfo(false);
    }
  } catch (err) {
    console.error('Failed to redeem gift card:', err);
    showError(t('profile.giftCardError'));
  } finally {
    isRedeeming.value = false;
  }
};

// 获取用户活跃会话信息
const fetchActiveSessions = async () => {
  loadingSessions.value = true;
  sessionError.value = '';
  
  try {
    const response = await getActiveSession();
    
    if (response && response.data) {
      // 确保response.data是数组
      const sessions = Array.isArray(response.data) ? response.data : 
                      (typeof response.data === 'object' && response.data !== null ? Object.values(response.data) : []);
      
      // 如果有login_at字段，按照登录时间降序排序（最新的在前面）
      const sortedSessions = sessions.sort((a, b) => {
        // 如果没有login_at字段，保持原顺序
        if (!a.login_at || !b.login_at) return 0;
        // 按照时间戳降序排序（最新的在前面）
        return b.login_at - a.login_at;
      });
      
      // 只保留前10个会话
      activeSessions.value = sortedSessions.slice(0, 10);
    } else {
      sessionError.value = t('profile.sessionError');
    }
  } catch (err) {
    console.error('Failed to fetch active sessions:', err);
    sessionError.value = err?.message || t('common.networkError');
  } finally {
    loadingSessions.value = false;
    // 检查所有API请求是否完成
    if (!loading.value && !loadingTelegram.value) {
      loading.value = false;
    }
  }
};

// 识别设备类型并返回对应图标组件
const getDeviceIcon = (ua) => {
  if (!ua) return IconBrowser;
  
  const uaLower = ua.toLowerCase();
  
  if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
    return IconDeviceMobile;
  } else if (uaLower.includes('android')) {
    return IconDeviceMobile;
  } else if (uaLower.includes('windows')) {
    return IconDeviceDesktop;
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    return IconDeviceDesktop;
  } else if (uaLower.includes('linux')) {
    return IconDeviceDesktop;
  } else {
    return IconBrowser;
  }
};

// 格式化设备信息
const formatDeviceInfo = (ua) => {
  if (!ua) return t('profile.unknownDevice');
  
  const uaLower = ua.toLowerCase();
  let deviceType = '';
  let browserType = '';
  
  // 检测设备类型
  if (uaLower.includes('iphone')) {
    deviceType = 'iPhone';
  } else if (uaLower.includes('ipad')) {
    deviceType = 'iPad';
  } else if (uaLower.includes('ipod')) {
    deviceType = 'iPod';
  } else if (uaLower.includes('android')) {
    deviceType = 'Android';
  } else if (uaLower.includes('windows')) {
    deviceType = 'Windows';
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    deviceType = 'MacOS';
  } else if (uaLower.includes('linux')) {
    deviceType = 'Linux';
  } else {
    deviceType = t('profile.unknownDevice');
  }
  
  // 检测浏览器类型
  if (uaLower.includes('edg/') || uaLower.includes('edge/')) {
    browserType = 'Edge';
  } else if (uaLower.includes('chrome/') && !uaLower.includes('chromium/')) {
    browserType = 'Chrome';
  } else if (uaLower.includes('firefox/')) {
    browserType = 'Firefox';
  } else if (uaLower.includes('safari/') && !uaLower.includes('chrome/') && !uaLower.includes('android')) {
    browserType = 'Safari';
  } else if (uaLower.includes('opera/') || uaLower.includes('opr/')) {
    browserType = 'Opera';
  } else {
    browserType = t('profile.unknownBrowser');
  }
  
  return `${deviceType} - ${browserType}`;
};

// 格式化时间戳为可读时间
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  // 检查时间戳是否为有效数字
  const numTimestamp = Number(timestamp);
  if (isNaN(numTimestamp)) return '';
  
  // 检查时间戳是否合理 (1970年至2100年之间)
  if (numTimestamp < 0 || numTimestamp > 4102444800) { // 4102444800 是 2100-01-01 的时间戳
    console.error('Invalid timestamp:', timestamp);
    return '';
  }
  
  try {
    // 格式化日期（传入日期对象，确保 formatDate 能正确处理）
    const date = new Date(numTimestamp * 1000);
    
    // 使用日期对象而不是时间戳调用 formatDate
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  } catch (err) {
    console.error('Error formatting timestamp:', err);
    return '';
  }
};

// 组件挂载时获取所有信息
onMounted(() => {
  loading.value = true; // 确保开始加载时设置loading状态
  // 并行发起所有API请求
  Promise.all([
    fetchUserInfo(false),
    PROFILE_CONFIG.showRecentDevices ? fetchActiveSessions() : Promise.resolve(),
    fetchTelegramInfo()
  ]).finally(() => {
    loading.value = false;
    // 另一个检查点，确保在数据加载完成后检查
    checkOpenPasswordModal();
  });
});
</script>

<style lang="scss" scoped>
.profile-container {
  padding: 1.25rem;
  padding-bottom: calc(1.25rem + 70px); /* 增加底部导航栏预留空间 */
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 3rem; /* 桌面版底部空间 */
  }
}

.profile-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 添加底部安全区域 */
.bottom-safe-area {
  height: 20px;
  width: 100%;
  margin-top: 20px;
  margin-bottom: 60px;
  @media (min-width: 768px) {
    display: none; /* 在桌面版不显示 */
  }
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

/* 骨架屏样式 */
.profile-skeleton {
  .profile-card {
    background-color: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color);
    margin-bottom: 24px;
    overflow: hidden;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      transform: translateX(-100%);
      background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0,
        rgba(255, 255, 255, 0.1) 20%,
        rgba(255, 255, 255, 0.2) 60%,
        rgba(255, 255, 255, 0) 100%
      );
      animation: shimmer 2s infinite;
      z-index: 1;
    }
  }
  
  .card-header {
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-color);
    background-color: rgba(var(--theme-color-rgb), 0.03);
    
    .skeleton-title {
      height: 20px;
      width: 120px;
      border-radius: 4px;
      background-color: var(--skeleton-color);
    }
  }
  
  .skeleton-content {
    padding: 20px;
    
    .skeleton-item {
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .skeleton-label {
        height: 14px;
        width: 80px;
        border-radius: 4px;
        margin-bottom: 8px;
        background-color: var(--skeleton-color);
      }
      
      .skeleton-value {
        height: 16px;
        width: 150px;
        border-radius: 4px;
        background-color: var(--skeleton-color);
      }
      
      .skeleton-description {
        height: 12px;
        width: 200px;
        border-radius: 4px;
        margin-top: 6px;
        background-color: var(--skeleton-color);
      }
    }
    
    .skeleton-setting {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(var(--border-color-rgb), 0.5);
      
      &:last-child {
        border-bottom: none;
      }
      
      .skeleton-text {
        flex: 1;
        margin-right: 16px;
      }
      
      .skeleton-toggle {
        width: 46px;
        height: 24px;
        border-radius: 12px;
        background-color: var(--skeleton-color);
      }
    }
    
    .skeleton-button {
      height: 36px;
      width: 120px;
      border-radius: 8px;
      background-color: var(--skeleton-color);
    }
  }
}

/* 黑暗模式适配 */
:root {
  --skeleton-color: rgba(0, 0, 0, 0.1);
}

body.dark-theme {
  --skeleton-color: rgba(255, 255, 255, 0.08);
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* 错误状态 */
.error-state {
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
  
  .error-icon {
    color: var(--text-muted);
    opacity: 0.7;
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
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(var(--theme-color-rgb), 0.35);
      background-color: rgba(var(--theme-color-rgb), 0.95);
    }
  }
}

/* 个人资料卡片 */
.profile-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  overflow: hidden;
  margin-bottom: 24px;
  
  &:hover {
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
  
  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    background-color: rgba(var(--theme-color-rgb), 0.03);
    
    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      color: var(--text-color);
    }
  }
  
  .info-content {
    padding: 20px;
        
    .info-list {
      display: grid;
      grid-template-columns: 1fr;
      grid-gap: 16px;
      
      @media (min-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .info-item {
        display: flex;
        flex-direction: column;
        
        .info-label {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        
        .info-value {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-color);
          
          &.highlight {
            color: #f44336;
          }
        }
      }
    }
  }
  
  .settings-content {
    padding: 16px 20px;
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(var(--border-color-rgb), 0.5);
      
      &:last-child {
        border-bottom: none;
      }
      
      .setting-info {
        flex: 1;
        margin-right: 16px;
        
        .setting-label {
          display: block;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-color);
          margin-bottom: 4px;
        }
        
        .setting-description {
          font-size: 13px;
          color: var(--text-muted);
        }
      }
    }
    
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      
      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 8px;
        background-color: rgba(var(--theme-color-rgb), 0.1);
        color: var(--theme-color);
        border: 1px solid rgba(var(--theme-color-rgb), 0.2);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          background-color: rgba(var(--theme-color-rgb), 0.2);
          transform: translateY(-2px);
        }
        
        &.danger {
          background-color: rgba(244, 67, 54, 0.1);
          color: #f44336;
          border-color: rgba(244, 67, 54, 0.2);
          
          &:hover {
            background-color: rgba(244, 67, 54, 0.2);
          }
        }
      }
    }
    
    .subscription-info {
      margin-top: 16px;
      padding: 12px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      border-radius: 8px;
      border: 1px dashed rgba(var(--theme-color-rgb), 0.3);
      
      .subscription-url {
        font-size: 14px;
        color: var(--text-color);
        word-break: break-all;
        line-height: 1.5;
      }
    }
    
    .gift-card-form {
      margin-top: 8px;
      
      .input-group {
        display: flex;
        gap: 10px;
        
        @media (max-width: 576px) {
          flex-direction: column;
          gap: 12px;
        }
        
        .gift-card-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background-color: var(--bg-secondary);
          color: var(--text-color);
          font-size: 15px;
          transition: all 0.3s ease;
          
          &:focus {
            outline: none;
            border-color: var(--theme-color);
            box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.1);
          }
        }
        
        .gift-card-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          background-color: var(--theme-color);
          color: white;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          
          @media (max-width: 576px) {
            width: 100%;
            padding: 12px 16px;
          }
          
          &:hover:not(:disabled) {
            background-color: rgba(var(--theme-color-rgb), 0.9);
            transform: translateY(-2px);
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
  }
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  
  &.disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + .slider {
      background-color: var(--theme-color);
    }
    
    &:checked + .slider:before {
      transform: translateX(22px);
    }
    
    &:disabled + .slider {
      cursor: not-allowed;
    }
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    
    &.loading {
      overflow: hidden;
      
      &:before {
        animation: pulse 1.5s infinite;
      }
      
      &:after {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
        animation: sweep 1.5s infinite;
      }
    }
    
    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      z-index: 1;
    }
    
    &.round {
      border-radius: 34px;
      
      &:before {
        border-radius: 50%;
      }
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

@keyframes sweep {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 弹窗样式 */
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
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color);
  }
  
  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
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
  padding: 20px;
  
  p {
    color: var(--text-color);
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 16px;
  }
  
  .form-group {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-color);
      margin-bottom: 8px;
    }
    
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background-color: var(--bg-secondary);
      color: var(--text-color);
      font-size: 15px;
      transition: all 0.3s ease;
      
      &:focus {
        outline: none;
        border-color: var(--theme-color);
        box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.1);
      }
    }
    
    .error-text {
      margin-top: 6px;
      color: #f44336;
      font-size: 13px;
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  
  button {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
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
    
    &.btn-submit {
      background-color: var(--theme-color);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
        background-color: rgba(var(--theme-color-rgb), 0.9);
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      &.danger {
        background-color: #f44336;
        
        &:hover:not(:disabled) {
          background-color: #d32f2f;
        }
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

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 576px) {
  .profile-container {
    padding: 1rem;
  }
  
  .info-content {
    padding: 16px !important;
  }
}

/* 设备列表样式 */
.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  .device-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border-radius: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      transform: translateY(-2px);
    }
    
    .device-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: rgba(var(--theme-color-rgb), 0.15);
      color: var(--theme-color);
      margin-right: 12px;
    }
    
    .device-info {
      flex: 1;
      
      .device-name {
        font-size: 15px;
        font-weight: 500;
        color: var(--text-color);
        margin-bottom: 4px;
      }
      
      .device-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 13px;
        color: var(--text-muted);
        
        .device-ip {
          display: flex;
          align-items: center;
        }
        
        .device-time {
          display: flex;
          align-items: center;
          
          &:before {
            content: '•';
            margin-right: 8px;
          }
        }
      }
    }
  }
}

/* 加载状态样式 */
.device-loading {
  .session-skeleton {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 12px;
    background-color: rgba(var(--border-color-rgb), 0.1);
    border-radius: 8px;
    
    .session-skeleton-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--skeleton-color);
      margin-right: 12px;
    }
    
    .session-skeleton-content {
      flex: 1;
      
      .session-skeleton-title {
        height: 16px;
        width: 120px;
        border-radius: 4px;
        background-color: var(--skeleton-color);
        margin-bottom: 8px;
      }
      
      .session-skeleton-info {
        height: 12px;
        width: 160px;
        border-radius: 4px;
        background-color: var(--skeleton-color);
      }
    }
  }
}

/* 错误和空状态样式 */
.device-error,
.device-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  
  p {
    margin: 12px 0;
    color: var(--text-muted);
  }
  
  .empty-icon {
    color: var(--text-muted);
    opacity: 0.7;
  }
  
  .refresh-btn {
    padding: 8px 16px;
    background-color: rgba(var(--theme-color-rgb), 0.1);
    color: var(--theme-color);
    border: 1px solid rgba(var(--theme-color-rgb), 0.2);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.2);
    }
  }
}

/* Telegram通信样式 */
.telegram-loading {
  .skeleton-wrapper {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background-color: rgba(var(--border-color-rgb), 0.1);
    border-radius: 8px;
  }
}

.telegram-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  
  p {
    margin: 12px 0;
    color: var(--text-muted);
  }
  
  .refresh-btn {
    padding: 8px 16px;
    background-color: rgba(var(--theme-color-rgb), 0.1);
    color: var(--theme-color);
    border: 1px solid rgba(var(--theme-color-rgb), 0.2);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.2);
    }
  }
}

/* Telegram弹窗样式 */
.tgbot-modal {
  max-width: 400px;
}

.step-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.step-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-color);
  margin-bottom: 4px;
}

.step-content {
  p {
    margin: 0 0 8px;
    color: var(--text-color);
    font-size: 14px;
    line-height: 1.5;
  }
  
  .tg-link {
    color: var(--theme-color);
    text-decoration: none;
    font-weight: 500;
  }
}

.command-container {
  display: flex;
  align-items: center;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  position: relative;
  margin-top: 8px;
  
  .command-text {
    flex: 1;
    margin: 0;
    padding: 0;
    font-family: monospace;
    font-size: 14px;
    color: var(--text-color);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-wrap: break-word;
    background: none;
  }
  
  .copy-command-btn {
    background: none;
    border: none;
    padding: 6px;
    margin-left: 8px;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      color: var(--theme-color);
    }
  }
}

.telegram-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.telegram-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--theme-color);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.05);
  }
  
  .telegram-icon {
    color: var(--theme-color);
  }
}
</style> 