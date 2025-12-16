<template>
  <div class="account-container">
    <!-- 自定义确认弹窗 -->
    <transition name="modal">
      <div class="custom-modal" v-if="showConfirmModal">
        <div class="modal-overlay" @click="cancelConfirmation"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>{{ $t('invite.confirm.title') }}</h3>
            <button class="modal-close" @click="cancelConfirmation">
              <IconX />
            </button>
          </div>
          <div class="modal-body">
            <p>{{ confirmModalMessage }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-outline cancel-btn" @click="cancelConfirmation">
              {{ $t('invite.confirm.cancel') }}
            </button>
            <button class="btn-primary confirm-btn" @click="confirmAction">
              {{ $t('invite.confirm.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
    
    <div class="account-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('invite.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('invite.description') }}</p>
        </div>
      </div>
      
      <!-- 返佣统计卡片组 -->
      <div class="stats-grid">
        <template v-if="loading.inviteData">
          <div v-for="i in 4" :key="i" class="stats-card skeleton-card">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
              <div class="skeleton-row-sm"></div>
              <div class="skeleton-row-xs"></div>
            </div>
          </div>
        </template>
        
        <template v-else>
        <div class="stats-card">
          <div class="stats-icon">
            <IconUsers :size="32" />
          </div>
          <div class="stats-info">
              <div class="stats-value">{{ inviteStats.registeredUsers }}</div>
            <div class="stats-label">{{ $t('invite.stats.registeredUsers') }}</div>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-icon">
            <IconCoin :size="32" />
          </div>
          <div class="stats-info">
              <div class="stats-value">{{ currencySymbol }}{{ inviteStats.pendingCommission }}</div>
            <div class="stats-label">{{ $t('invite.stats.pendingCommission') }}</div>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-icon">
            <IconWallet :size="32" />
          </div>
          <div class="stats-info">
              <div class="stats-value">{{ currencySymbol }}{{ inviteStats.availableCommission }}</div>
            <div class="stats-label">{{ $t('invite.stats.availableCommission') }}</div>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-icon">
            <IconChartBar :size="32" />
          </div>
          <div class="stats-info">
              <div class="stats-value">{{ inviteStats.commissionRate }}%</div>
            <div class="stats-label">{{ $t('invite.stats.commissionRate') }}</div>
          </div>
        </div>
        </template>
      </div>
      
      <!-- 返佣规则卡片 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('invite.rules.title') }}</h2>
        </div>
        <div class="card-body">
          <div class="rules-grid">
            <div class="rule-item">
              <div class="rule-icon">
                <IconShare :size="24" />
              </div>
              <div class="rule-content">
                <h3>{{ $t('invite.rules.share.title') }}</h3>
                <p>{{ $t('invite.rules.share.desc') }}</p>
              </div>
            </div>
            
            <div class="rule-item">
              <div class="rule-icon">
                <IconUserPlus :size="24" />
              </div>
              <div class="rule-content">
                <h3>{{ $t('invite.rules.register.title') }}</h3>
                <p>{{ $t('invite.rules.register.desc') }}</p>
              </div>
            </div>
            
            <div class="rule-item">
              <div class="rule-icon">
                <IconShoppingCart :size="24" />
              </div>
              <div class="rule-content">
                <h3>{{ $t('invite.rules.purchase.title') }}</h3>
                <p>{{ $t('invite.rules.purchase.desc') }}</p>
              </div>
            </div>
            
            <div class="rule-item">
              <div class="rule-icon">
                <IconCash :size="24" />
              </div>
              <div class="rule-content">
                <h3>{{ $t('invite.rules.commission.title') }}</h3>
                <p>{{ $t('invite.rules.commission.desc', { rate: inviteStats.commissionRate }) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 佣金余额卡片 -->
      <div class="dashboard-card balance-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('invite.balance.title') }}</h2>
        </div>
        <div v-if="loading.inviteData" class="card-body skeleton-loading">
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </div>
        <div v-else class="card-body">
          <div class="balance-container">
            <div class="balance-info">
              <div class="balance-label">{{ $t('invite.balance.available') }}</div>
              <div class="balance-value">{{ currencySymbol }}{{ inviteStats.availableCommission }}</div>
              <div class="balance-description">{{ $t('invite.balance.description') }}</div>
            </div>
            <div class="balance-actions">
              <button class="btn-primary" @click="toggleTransferCard">
                <IconCash class="btn-icon" />
                {{ $t('invite.balance.transferToBalance') }}
              </button>
              <button v-if="withdrawClose === 0" class="btn-primary withdraw-btn" @click="toggleWithdrawCard">
                <IconReceipt class="btn-icon" />
                {{ $t('invite.balance.withdraw') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 划转到余额弹窗 -->
      <transition name="modal-fade">
        <div v-if="showTransferCardState" class="modal-overlay" @click="showTransferCardState = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>{{ $t('invite.transfer.title') }}</h3>
              <button class="modal-close" @click="showTransferCardState = false">
                <IconX :size="20" />
              </button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <IconAlertTriangle :size="22" class="alert-icon" />
                <div class="alert-content">
                  <div class="alert-title">{{ $t('invite.transfer.warning') }}</div>
                  <div class="alert-desc">{{ $t('invite.transfer.warningDesc') }}</div>
                </div>
              </div>
              
              <div class="transfer-form">
                <div class="form-group">
                  <label class="form-label">{{ $t('invite.transfer.amount') }}</label>
                  <div class="input-with-prefix">
                    <div class="input-prefix">{{ currencySymbol }}</div>
                    <input 
                      type="number" 
                      v-model="transferAmount" 
                      class="form-control" 
                      :placeholder="$t('invite.transfer.amountPlaceholder')"
                      min="0"
                      :max="inviteStats.availableCommission"
                      step="0.01"
                    />
                  </div>
                  <div class="form-hint">
                    {{ $t('invite.transfer.availableCommission') }}: {{ currencySymbol }}{{ inviteStats.availableCommission }}
                  </div>
                  <div v-if="transferError" class="error-message">{{ transferError }}</div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="showTransferCardState = false">
                {{ $t('common.cancel') }}
              </button>
              <button 
                class="btn-submit" 
                @click="confirmTransfer"
                :disabled="isTransferDisabled || transferLoading"
              >
                <div v-if="transferLoading" class="loader"></div>
                <span v-else>{{ $t('invite.transfer.confirm') }}</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- 提现弹窗 -->
      <transition name="modal-fade">
        <div v-if="showWithdrawCard" class="modal-overlay" @click="closeWithdrawCard()">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>{{ $t('invite.withdraw.title') }}</h3>
              <button class="modal-close" @click="closeWithdrawCard()">
                <IconX :size="20" />
              </button>
            </div>
            <div class="modal-body">
              <div v-if="withdrawMethods.length === 0" class="alert alert-warning">
                <IconAlertTriangle :size="22" class="alert-icon" />
                <div class="alert-content">
                  <div class="alert-title">{{ $t('invite.withdraw.tip') }}</div>
                  <div class="alert-desc">{{ $t('invite.withdraw.noPlatforms') }}</div>
                </div>
              </div>
              
              <div v-else-if="parseFloat(inviteStats.availableCommission) <= 0" class="alert alert-warning">
                <IconAlertTriangle :size="22" class="alert-icon" />
                <div class="alert-content">
                  <div class="alert-title">{{ $t('invite.withdraw.tip') }}</div>
                  <div class="alert-desc">{{ $t('invite.withdraw.insufficientFunds') }}</div>
                </div>
              </div>
              
              <div v-else class="transfer-form">
                <div class="form-group">
                  <label class="form-label">{{ $t('invite.withdraw.platform') }}</label>
                  <div class="withdraw-methods">
                    <button
                      v-for="(method, index) in withdrawMethods"
                      :key="index"
                      class="withdraw-method"
                      :class="{ 'active': selectedWithdrawMethod === method }"
                      @click="selectWithdrawMethod(method)"
                    >
                      {{ method }}
                    </button>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">{{ $t('invite.withdraw.account') }}</label>
                  <div class="input-with-prefix account-input">
                    <input 
                      type="text" 
                      v-model="withdrawAccount" 
                      class="form-control" 
                      :placeholder="$t('invite.withdraw.accountPlaceholder')"
                    />
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">{{ $t('invite.withdraw.amount') }}</label>
                  <div class="input-with-prefix">
                    <div class="input-prefix">{{ currencySymbol }}</div>
                    <input 
                      type="number" 
                      v-model="withdrawAmount" 
                      class="form-control" 
                      :placeholder="$t('invite.withdraw.amountPlaceholder')"
                      min="0"
                      :max="inviteStats.availableCommission"
                      step="0.01"
                    />
                  </div>
                  <div class="form-hint">
                    {{ $t('invite.withdraw.availableCommission') }}: {{ currencySymbol }}{{ inviteStats.availableCommission }}
                    <span v-if="minWithdrawAmount > 0" class="min-withdraw-hint">
                      ({{ $t('invite.withdraw.minWithdrawAmount') }}: {{ currencySymbol }}{{ minWithdrawAmount }})
                    </span>
                  </div>
                </div>
                
                <div v-if="withdrawError && withdrawError !== t('invite.withdraw.insufficientFunds')" class="error-message">{{ withdrawError }}</div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="closeWithdrawCard">
                {{ $t('common.cancel') }}
              </button>
              <button 
                class="btn-submit" 
                @click="submitWithdraw"
                :disabled="!withdrawAccount || !selectedWithdrawMethod || withdrawLoading || parseFloat(inviteStats.availableCommission) <= 0"
              >
                <div v-if="withdrawLoading" class="loader"></div>
                <span v-else>{{ $t('invite.withdraw.confirm') }}</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- 邀请链接卡片 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('invite.inviteLink.title') }}</h2>
          <div class="card-actions">
            <button class="btn-action" @click="createInviteCode" :disabled="creatingCode">
              <div v-if="creatingCode" class="loading-icon"></div>
              <IconPlus v-else class="action-icon" />
              {{ creatingCode ? $t('invite.inviteLink.creating') : $t('invite.inviteLink.createCode') }}
            </button>
          </div>
        </div>
        <div v-if="loading.inviteData" class="card-body skeleton-loading">
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </div>
        <div v-else class="card-body">
          <template v-if="inviteCodes.length > 0">
            <div class="invite-codes-wrapper">
              <div class="invite-cards-container">
                <div class="invite-cards-nav prev" @click="prevInviteCode" v-if="inviteCodes.length > 1">
                  <IconChevronLeft />
                </div>
                
                <div class="invite-cards-wrapper">
                  <transition-group name="invite-card" tag="div" class="invite-cards">
                    <div 
                      v-for="(code, index) in inviteCodes" 
                      :key="code.id || 'invite-code-' + index" 
                      class="invite-card"
                      :class="{ 'active': selectedCodeIndex === index, 'prev': index < selectedCodeIndex, 'next': index > selectedCodeIndex }"
                      @click="selectedCodeIndex = index"
                    >
                      <div class="invite-card-inner">
                        <div class="card-shine"></div>
                        <div class="card-decoration"></div>
                        
                        <div class="invite-card-header">
                          <div class="invite-card-title">
                            <IconTicket class="card-icon" />
                            {{ $t('invite.inviteLink.inviteCode') }} {{ index + 1 }}
                          </div>
                        </div>
                        
                        <div class="invite-card-body">
                          <div class="invite-code-display">
                            <span v-for="(char, i) in code.code" :key="i" class="code-char">{{ char }}</span>
                          </div>
                        </div>
                        
                        <div class="invite-card-footer">
                          <div class="card-label">{{ $t('invite.inviteLink.scanDescription') }}</div>
                          <div class="invite-card-date">{{ $t('invite.inviteLink.createdAt', { date: formatCodeDate(code.created_at) }) }}</div>
                        </div>
                      </div>
                    </div>
                  </transition-group>
                </div>
                
                <div class="invite-cards-nav next" @click="nextInviteCode" v-if="inviteCodes.length > 1">
                  <IconChevronRight />
                </div>
              </div>
              
              <!-- 添加指示器 -->
              <div class="invite-cards-indicators" v-if="inviteCodes.length > 1">
                <span 
                  v-for="(code, index) in inviteCodes" 
                  :key="code.id"
                  class="indicator"
                  :class="{ 'active': selectedCodeIndex === index }"
                  @click="selectedCodeIndex = index"
                ></span>
              </div>
              
              <div class="invite-link-wrapper">
                <div class="input-with-icon">
                  <IconLink class="input-icon" />
                  <input 
                    type="text" 
                    class="invite-link" 
                    :value="inviteLink" 
                    readonly
                    :placeholder="$t('invite.inviteLink.placeholder')"
                  />
                </div>
                <button class="btn-primary" @click="copyInviteLink">
                  <IconCopy class="btn-icon" />
                  {{ $t('invite.inviteLink.copyLink') }}
                </button>
              </div>
            </div>
            
            <div class="share-buttons mt-3">
              <button class="btn-outline wechat-btn" @click="shareToWechat">
                <IconBrandWechat class="btn-icon" /> {{ $t('invite.share.wechat') }}
              </button>
              <button class="btn-outline qq-btn" @click="shareToQQ">
                <IconBrandQq class="btn-icon" /> {{ $t('invite.share.qq') }}
              </button>
              <button class="btn-outline twitter-btn" @click="shareToTwitter">
                <IconBrandTwitter class="btn-icon" /> {{ $t('invite.share.twitter') }}
              </button>
              <button class="btn-outline telegram-btn" @click="shareToTelegram">
                <IconBrandTelegram class="btn-icon" /> {{ $t('invite.share.telegram') }}
              </button>
            </div>
          </template>
          <div v-else class="no-invite-code">
            <p>{{ $t('invite.inviteLink.noInviteCode') }}</p>
            <button class="btn-primary create-code-btn" @click="createInviteCode" :disabled="creatingCode">
              <div v-if="creatingCode" class="loading-icon"></div>
              <span v-else class="create-btn-content">
                <IconPlus class="btn-icon" />
                {{ $t('invite.inviteLink.createCode') }}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 邀请记录卡片 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('invite.records.title') }}</h2>
          <div class="card-actions">
            <button class="btn-action" @click="refreshRecords" :disabled="loading.inviteDetails">
              <IconRefresh class="action-icon" :class="{ 'spin': loading.inviteDetails }" />
              {{ loading.inviteDetails ? $t('invite.records.refreshing') : $t('invite.records.refresh') }}
            </button>
          </div>
        </div>
        <div v-if="loading.inviteDetails" class="card-body skeleton-loading">
          <div class="skeleton-table">
            <div class="skeleton-header-row">
              <div class="skeleton-header-cell"></div>
              <div class="skeleton-header-cell"></div>
              <div class="skeleton-header-cell"></div>
              <div class="skeleton-header-cell"></div>
            </div>
            <div v-for="i in 3" :key="i" class="skeleton-row-full">
              <div class="skeleton-cell"></div>
              <div class="skeleton-cell"></div>
              <div class="skeleton-cell"></div>
              <div class="skeleton-cell"></div>
            </div>
          </div>
        </div>
        <div v-else class="card-body">
          <div class="records-table-wrapper">
            <template v-if="inviteRecords.length > 0">
            <table class="records-table">
              <thead>
                <tr>
                  <th>{{ $t('invite.records.registerTime') }}</th>
                  <th>{{ $t('invite.records.amount') }}</th>
                  <th>{{ $t('invite.records.commission') }}</th>
                  <th>{{ $t('invite.records.status.title') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in paginatedRecords" :key="record.id">
                    <td>{{ formatDate(record.created_at) }}</td>
                    <td>{{ currencySymbol }}{{ record.amount || '0.00' }}</td>
                    <td>{{ currencySymbol }}{{ record.commission_amount }}</td>
                    <td>
                      <span class="status-badge" :class="record.commission_status === 1 ? 'confirmed' : 'pending'">
                        {{ record.commission_status === 1 ? $t('invite.records.status.confirmed') : $t('invite.records.status.pending') }}
                      </span>
                    </td>
                </tr>
              </tbody>
            </table>
            
            <!-- 添加分页控件 -->
            <div class="pagination-controls" v-if="totalPages > 1">
              <button 
                class="page-btn prev-btn" 
                @click="handlePageChange(currentPage - 1)" 
                :disabled="currentPage === 1 || loading.inviteDetails"
              >
                <IconChevronLeft size="16" />
              </button>
              
              <div class="page-numbers">
                <!-- 第一页 - 仅在桌面端显示 -->
                <button 
                  v-if="totalPages > 4 && currentPage > 3 && !isMobile" 
                  class="page-btn" 
                  :class="{ active: currentPage === 1 }"
                  @click="handlePageChange(1)"
                  :disabled="loading.inviteDetails"
                >
                  1
                </button>
                
                <!-- 省略号 - 仅在桌面端显示 -->
                <span v-if="totalPages > 4 && currentPage > 3 && !isMobile" class="page-ellipsis">...</span>
                
                <!-- 页码按钮 -->
                <template v-for="page in displayPageNumbers" :key="'page-'+page">
                  <button 
                    class="page-btn"
                    :class="{ active: currentPage === page }"
                    @click="handlePageChange(page)"
                    :disabled="loading.inviteDetails"
                  >
                    {{ page }}
                  </button>
                </template>
                
                <!-- 省略号 - 仅在桌面端显示 -->
                <span v-if="totalPages > 4 && currentPage < totalPages - 2 && !isMobile" class="page-ellipsis">...</span>
                
                <!-- 最后一页 - 仅在桌面端显示 -->
                <button 
                  v-if="totalPages > 4 && currentPage < totalPages - 2 && !isMobile" 
                  class="page-btn" 
                  :class="{ active: currentPage === totalPages }"
                  @click="handlePageChange(totalPages)"
                  :disabled="loading.inviteDetails"
                >
                  {{ totalPages }}
                </button>
              </div>
              
              <button 
                class="page-btn next-btn" 
                @click="handlePageChange(currentPage + 1)" 
                :disabled="currentPage === totalPages || loading.inviteDetails"
              >
                <IconChevronRight size="16" />
              </button>
              
              <!-- 添加每页显示数量选择器 -->
              <div class="page-size-container">
                <div class="page-size-selector" @click="togglePageSizeDropdown" :class="{ disabled: loading.inviteDetails }">
                  <div class="select-value">{{ pageSize }}</div>
                  <div class="select-icon">
                    <IconChevronDown :class="{ 'rotate-180': showPageSizeDropdown }" />
                  </div>
                  
                  <transition name="fade">
                    <div class="select-dropdown" v-if="showPageSizeDropdown">
                      <div 
                        v-for="size in pageSizeOptions" 
                        :key="size"
                        class="select-option"
                        :class="{ selected: size === pageSize }"
                        @click.stop="selectPageSize(size)"
                      >
                        {{ size }}
                      </div>
                    </div>
                  </transition>
                </div>
              </div>
            </div>
            </template>
            <div v-else class="empty-records">
              <p>{{ $t('invite.records.noRecords') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n';
import { ref, computed, onMounted, onUnmounted, reactive, nextTick } from 'vue';
import { useToast } from '@/composables/useToast';
import { INVITE_CONFIG } from '@/utils/baseConfig';
import { getInviteData, getInviteDetails, getCommissionConfig, generateInviteCode, transferCommission, withdrawCommission } from '@/api/invite';
import {
  IconUsers,
  IconCoin,
  IconWallet,
  IconChartBar,
  IconCopy,
  IconBrandWechat,
  IconBrandTwitter,
  IconBrandTelegram,
  IconShare,
  IconUserPlus,
  IconShoppingCart,
  IconCash,
  IconRefresh,
  IconPlus,
  IconBrandQq,
  IconLink,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconTicket,
  IconAlertTriangle,
  IconReceipt,
} from '@tabler/icons-vue';

export default {
  name: 'InviteView',
  components: {
    IconUsers,
    IconCoin,
    IconWallet,
    IconChartBar,
    IconCopy,
    IconBrandWechat,
    IconBrandTwitter,
    IconBrandTelegram,
    IconShare,
    IconUserPlus,
    IconShoppingCart,
    IconCash,
    IconRefresh,
    IconPlus,
    IconBrandQq,
    IconLink,
    IconX,
    IconChevronLeft,
    IconChevronRight,
    IconChevronDown,
    IconTicket,
    IconAlertTriangle,
    IconReceipt,
  },
  setup() {
    const { showToast } = useToast();
    const { t } = useI18n();
    
    // 加载状态
    const loading = reactive({
      inviteData: true,
      inviteDetails: true,
      commConfig: true
    });
    
    // 创建邀请码状态
    const creatingCode = ref(false);
    
    // 货币配置
    const currency = ref('CNY');
    const currencySymbol = ref('¥');
    
    // 邀请码列表
    const inviteCodes = ref([]);
    const selectedCodeIndex = ref(0);
    
    // 统计数据
    const inviteStats = reactive({
      registeredUsers: 0,
      validCommission: 0,
      pendingCommission: 0,
      commissionRate: 0,
      availableCommission: 0
    });
    
    // 邀请记录
    const inviteRecords = ref([]);
    
    // 添加分页相关变量
    const currentPage = ref(1);
    // 确保使用config.js中配置的每页条数，config.js中的配置会覆盖默认值
    const pageSize = ref(INVITE_CONFIG.recordsPerPage || 10);
    const totalRecords = ref(0);
    
    // 添加分页大小选择相关变量
    const pageSizeOptions = [10, 20, 50, 100, 200];
    const showPageSizeDropdown = ref(false);
    
    // 切换分页大小选择下拉框显示状态
    const togglePageSizeDropdown = () => {
      showPageSizeDropdown.value = !showPageSizeDropdown.value;
    };
    
    // 选择分页大小
    const selectPageSize = (size) => {
      if (pageSize.value !== size) {
        pageSize.value = size;
        currentPage.value = 1; // 切换每页显示数量时重置到第一页
        fetchInviteDetails(1); // 重新获取数据
      }
      showPageSizeDropdown.value = false;
    };
    
    // 点击外部区域关闭下拉框
    const closePageSizeDropdownOnClickOutside = (event) => {
      const dropdown = document.querySelector('.page-size-selector');
      if (dropdown && !dropdown.contains(event.target)) {
        showPageSizeDropdown.value = false;
      }
    };
    
    // 返佣记录直接使用API返回的数据，不需要本地分页
    const paginatedRecords = computed(() => inviteRecords.value);
    
    // 计算总页数
    const totalPages = computed(() => {
      return Math.ceil(totalRecords.value / pageSize.value);
    });
    
    // 计算应该显示哪些页码
    const displayPageNumbers = computed(() => {
      const pages = [];
      // 根据屏幕宽度决定显示的页码数量
      const maxVisiblePages = isMobile.value ? 1 : 3; // 手机上最多显示1个页码按钮，桌面端显示3个
      
      if (totalPages.value <= maxVisiblePages) {
        // 如果总页数少于或等于最大可见页数，显示所有页码
        for (let i = 1; i <= totalPages.value; i++) {
          pages.push(i);
        }
      } else {
        // 否则，显示当前页附近的页码
        let startPage = Math.max(currentPage.value - Math.floor(maxVisiblePages / 2), 1);
        let endPage = startPage + maxVisiblePages - 1;
        
        if (endPage > totalPages.value) {
          endPage = totalPages.value;
          startPage = Math.max(endPage - maxVisiblePages + 1, 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
          pages.push(i);
        }
      }
      
      return pages;
    });
    
    // 添加分页功能方法
    const handlePageChange = (page) => {
      // 确保页码在有效范围内
      if (page < 1) {
        page = 1;
      } else if (page > totalPages.value) {
        page = totalPages.value;
      }
      
      // 只有当页码与当前页不同时才更新
      if (page !== currentPage.value) {
        currentPage.value = page;
        fetchInviteDetails(page);
        
        // 滚动表格到可视区域
        nextTick(() => {
          const tableElement = document.querySelector('.records-table-wrapper');
          if (tableElement) {
            tableElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      }
    };
    
    // 计算邀请链接
    const inviteLink = computed(() => {
      if (inviteCodes.value.length === 0 || selectedCodeIndex.value >= inviteCodes.value.length) {
        return '';
      }
      const code = inviteCodes.value[selectedCodeIndex.value].code;
      
      // 根据配置决定使用哪个域名
      if (INVITE_CONFIG.inviteLinkConfig && INVITE_CONFIG.inviteLinkConfig.linkMode === 'custom') {
        // 使用自定义域名
        const customDomain = INVITE_CONFIG.inviteLinkConfig.customDomain;
        // 确保域名末尾没有斜杠
        const domain = customDomain.endsWith('/') ? customDomain.slice(0, -1) : customDomain;
        return `${domain}/#/register?code=${code}`;
      } else {
        // 使用当前站点域名（自动模式）
        return `${window.location.origin}/#/register?code=${code}`;
      }
    });
    
    // 创建邀请码
    const createInviteCode = async () => {
      if (creatingCode.value) return;
      
      creatingCode.value = true;
      
      try {
        const res = await generateInviteCode();
        
        if (res.data) {
          // 刷新邀请数据
          await fetchInviteData();
          handleSuccess(t('invite.inviteLink.created'));
        }
      } catch (error) {
        handleError(error);
      } finally {
        creatingCode.value = false;
      }
    };
    
    // 复制邀请链接
    const copyInviteLink = () => {
      if (!inviteLink.value) return;
      
      navigator.clipboard.writeText(inviteLink.value)
        .then(() => {
          handleSuccess(t('invite.inviteLink.copied'));
        })
        .catch(() => {
          // 如果剪贴板API不可用，使用传统方法
          const textarea = document.createElement('textarea');
          textarea.value = inviteLink.value;
          textarea.style.position = 'fixed';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          
          try {
            const successful = document.execCommand('copy');
            if (successful) {
              handleSuccess(t('invite.inviteLink.copied'));
            } else {
              throw new Error('Copy failed');
            }
          } catch (err) {
            handleError({ message: t('common.copyFailed') });
          }
          
          document.body.removeChild(textarea);
        });
    };
    
    // 确认弹窗状态
    const showConfirmModal = ref(false);
    const confirmModalMessage = ref('');
    const pendingAction = ref(null);
    
    // 确认操作
    const confirmAction = () => {
      if (pendingAction.value) {
        pendingAction.value();
      }
      showConfirmModal.value = false;
    };
    
    // 取消确认
    const cancelConfirmation = () => {
      showConfirmModal.value = false;
      pendingAction.value = null;
    };
    
    // 分享功能
    const shareToWechat = () => {
      // 微信分享链接
      if (!inviteLink.value) {
        showToast(t('invite.share.noLinkAvailable'), 'error');
        return;
      }
      
      // 微信分享需要在微信内部使用，这里提供二维码扫描方案
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink.value)}`;
      
      // 创建并显示二维码弹窗
      const win = window.open('', '_blank', 'width=600,height=400');
      win.document.write(`
        <html>
          <head>
            <title>${t('invite.share.scanTitle')}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              img { max-width: 100%; height: auto; margin-bottom: 20px; }
              h2 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h2>${t('invite.share.scanQRCode')}</h2>
            <img src="${qrCodeUrl}" alt="${t('invite.share.inviteQRCode')}" />
            <p>${t('invite.share.orCopyLink')}: ${inviteLink.value}</p>
          </body>
        </html>
      `);
    };
    
    const shareToTwitter = () => {
      if (!inviteLink.value) {
        showToast(t('invite.share.noLinkAvailable'), 'error');
        return;
      }
      // 使用Twitter的Web Intent API
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('invite.share.shareDescription'))}&url=${encodeURIComponent(inviteLink.value)}`, '_blank');
    };
    
    const shareToTelegram = () => {
      if (!inviteLink.value) {
        showToast(t('invite.share.noLinkAvailable'), 'error');
        return;
      }
      // 使用Telegram的分享URL
      window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink.value)}&text=${encodeURIComponent(t('invite.share.shareDescription'))}`, '_blank');
    };
    
    // 添加QQ分享功能
    const shareToQQ = () => {
      if (!inviteLink.value) {
        showToast(t('invite.share.noLinkAvailable'), 'error');
        return;
      }
      // 使用QQ的分享链接
      window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(inviteLink.value)}&title=${encodeURIComponent(t('invite.share.shareTitle'))}&desc=${encodeURIComponent(t('invite.share.shareDescription'))}`, '_blank');
    };
    
    // 刷新记录
    const refreshRecords = () => {
      if (loading.inviteDetails) return;
      
      showToast(t('invite.records.refreshingData'), 'info');
      currentPage.value = 1; // 重置到第一页
      fetchInviteDetails(1);
    };
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return '-';
      const date = new Date(timestamp * 1000);
      // 格式化为 YYYY-MM-DD HH:MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };
    
    // 获取佣金状态样式
    const getStatusClass = (status) => {
      switch (status) {
        case 0: return 'waiting';  // 待确认
        case 1: return 'pending';  // 发放中
        case 2: return 'success';  // 有效
        case 3: return 'danger';   // 无效
        default: return 'waiting';
      }
    };
    
    // 获取佣金状态文本
    const getStatusText = (status) => {
      switch (status) {
        case 0: return t('invite.records.status.waiting');
        case 1: return t('invite.records.status.processing');
        case 2: return t('invite.records.status.confirmed');
        case 3: return t('invite.records.status.invalid');
        default: return t('invite.records.status.unknown');
      }
    };
    
    // 获取邀请数据
    const fetchInviteData = async () => {
      loading.inviteData = true;
      try {
        const res = await getInviteData();
        if (res.data) {
          inviteCodes.value = res.data.codes || [];
          if (res.data.stat) {
            inviteStats.registeredUsers = res.data.stat[0] || 0;
            inviteStats.validCommission = ((res.data.stat[1] || 0) / 100).toFixed(2); // 分转元并保留2位小数
            inviteStats.pendingCommission = ((res.data.stat[2] || 0) / 100).toFixed(2); // 分转元并保留2位小数
            inviteStats.commissionRate = res.data.stat[3] || 0;
            inviteStats.availableCommission = ((res.data.stat[4] || 0) / 100).toFixed(2); // 分转元并保留2位小数
          }
        }
      } catch (err) {
        console.error('获取邀请数据失败:', err);
        showToast(t('invite.records.fetchDataError'), 'error');
      } finally {
        loading.inviteData = false;
      }
    };
    
    // 获取邀请明细
    const fetchInviteDetails = async (page = 1) => {
      loading.inviteDetails = true;
      try {
        // 使用当前选择的每页显示数量（确保至少为10，因为API限制）
        // 优先使用用户选择的pageSize，这个优先级高于config.js中的设置
        const recordsPerPage = Math.max(pageSize.value, 10);
        const res = await getInviteDetails(page, recordsPerPage);
        
        if (res.data) {
          // 处理金额数据，将分转为元
          inviteRecords.value = Array.isArray(res.data) ? res.data.map(record => ({
            id: record.id,
            trade_no: record.trade_no,
            created_at: record.created_at,
            user: record.user || null,
            amount: record.order_amount ? (record.order_amount / 100).toFixed(2) : '0.00',
            commission_amount: record.get_amount ? (record.get_amount / 100).toFixed(2) : '0.00',
            commission_status: 1 // 这里是有效的佣金，所以状态为已确认
          })) : [];
          
          // 更新总记录数
          totalRecords.value = res.total || inviteRecords.value.length;
        } else {
          inviteRecords.value = [];
          totalRecords.value = 0;
        }
      } catch (err) {
        console.error('获取邀请明细失败:', err);
        showToast(t('invite.records.fetchError'), 'error');
        inviteRecords.value = [];
        totalRecords.value = 0;
      } finally {
        loading.inviteDetails = false;
      }
    };
    
    // 获取佣金配置
    const fetchCommConfig = async () => {
      loading.commConfig = true;
      try {
        const res = await getCommissionConfig();
        if (res.data) {
          currency.value = res.data.currency || 'CNY';
          currencySymbol.value = res.data.currency_symbol || '¥';
          
          // 修复withdraw_close的处理
          // 将API返回的withdraw_close值转为数字类型进行比较
          // 如果返回的withdraw_close为0，则表示开启提现功能
          withdrawClose.value = Number(res.data.withdraw_close);
          // console.log('API返回的withdraw_close:', res.data.withdraw_close);
          // console.log('转换后的withdrawClose.value:', withdrawClose.value);
          
          withdrawMethods.value = res.data.withdraw_methods || []; // 提现方式列表
          
          // 解析最小提现金额，如果存在的话
          if (res.data.min_withdraw_amount) {
            minWithdrawAmount.value = parseFloat(res.data.min_withdraw_amount) / 100; // 分转元
          }
        }
      } catch (err) {
        console.error('获取佣金配置失败:', err);
      } finally {
        loading.commConfig = false;
      }
    };
    
    // 切换到前一个邀请码
    const prevInviteCode = () => {
      if (inviteCodes.value.length > 1) {
        selectedCodeIndex.value = (selectedCodeIndex.value - 1 + inviteCodes.value.length) % inviteCodes.value.length;
      }
    };
    
    // 切换到后一个邀请码
    const nextInviteCode = () => {
      if (inviteCodes.value.length > 1) {
        selectedCodeIndex.value = (selectedCodeIndex.value + 1) % inviteCodes.value.length;
      }
    };
    
    // 在 script 部分添加日期格式化函数
    const formatCodeDate = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp * 1000);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    };
    
    // 新增的 showTransferCard 和 transferAmount 状态
    const showTransferCardState = ref(false);
    const transferAmount = ref(0);
    const transferError = ref('');
    const transferLoading = ref(false);
    const isTransferDisabled = computed(() => transferAmount.value <= 0 || transferAmount.value > inviteStats.availableCommission);
    
    // 切换转账弹窗显示状态
    const toggleTransferCard = () => {
      // 如果提现弹窗正在显示，先关闭它
      if (showWithdrawCard.value) {
        pendingCardAction.value = 'transfer';
        showWithdrawCard.value = false;
      } else {
        showTransferCardState.value = true;
        // 重置值
        transferAmount.value = '';
        transferError.value = '';
      }
    };
    
    // 验证划转金额
    const validateTransferAmount = () => {
      transferError.value = '';
      
      if (!transferAmount.value || parseFloat(transferAmount.value) <= 0) {
        transferError.value = t('invite.transfer.invalidAmount');
        return false;
      }
      
      if (parseFloat(transferAmount.value) > parseFloat(inviteStats.availableCommission)) {
        transferError.value = t('invite.transfer.insufficientFunds');
        return false;
      }
      
      return true;
    };
    
    // 确认划转
    const confirmTransfer = async () => {
      if (!validateTransferAmount()) return;
      
      transferLoading.value = true;
      
      try {
        // 将金额转换为分 (前端的元转为后端需要的分)
        const amountInCents = Math.round(parseFloat(transferAmount.value) * 100);
        const res = await transferCommission(amountInCents);
        
        if (res.data === true) {
          // 重置表单
          transferAmount.value = 0;
          transferError.value = '';
          
          // 显示成功消息
          handleSuccess(t('invite.transfer.success'));
          
          // 刷新数据
          await fetchInviteData();
          
          // 关闭卡片
          showTransferCardState.value = false;
        } else {
          transferError.value = res.message || t('invite.transfer.failure');
        }
      } catch (error) {
        handleError(error);
        transferError.value = error.response?.message || t('invite.transfer.failure');
      } finally {
        transferLoading.value = false;
      }
    };
    
    // 切换提现弹窗显示状态
    const toggleWithdrawCard = () => {
      // 如果转账弹窗正在显示，先关闭它
      if (showTransferCardState.value) {
        pendingCardAction.value = 'withdraw';
        showTransferCardState.value = false;
      } else {
        showWithdrawCard.value = true;
        // 重置值
        withdrawAccount.value = '';
        withdrawAmount.value = '';
        withdrawError.value = '';
        
        // 如果有可用的提现方式，默认选择第一个
        if (withdrawMethods.value.length > 0) {
          selectedWithdrawMethod.value = withdrawMethods.value[0];
        } else {
          selectedWithdrawMethod.value = '';
        }
      }
    };
    
    // 关闭提现弹窗
    const closeWithdrawCard = () => {
      showWithdrawCard.value = false;
      withdrawError.value = '';
    };
    
    // 切换下拉框显示
    const toggleMethodDropdown = () => {
      if (withdrawMethods.value.length === 0) return;
      showMethodDropdown.value = !showMethodDropdown.value;
    };
    
    // 选择提现方式
    const selectWithdrawMethod = (method) => {
      selectedWithdrawMethod.value = method;
      showMethodDropdown.value = false;
    };
    
    // 点击外部关闭下拉框
    const closeDropdownOnClickOutside = (event) => {
      const dropdown = document.querySelector('.custom-select');
      if (dropdown && !dropdown.contains(event.target)) {
        showMethodDropdown.value = false;
      }
    };
    
    // 提交提现请求
    const submitWithdraw = async () => {
      if (!withdrawAccount.value || !selectedWithdrawMethod.value) {
        withdrawError.value = t('validation.required', { field: t('invite.withdraw.account') });
        return;
      }
      
      // 检查提现金额是否有效
      const amount = parseFloat(withdrawAmount.value);
      if (isNaN(amount) || amount <= 0) {
        withdrawError.value = t('invite.withdraw.invalidAmount');
        showToast(withdrawError.value, 'error');
        return;
      }
      
      // 检查提现金额是否超过可用佣金
      if (amount > parseFloat(inviteStats.availableCommission)) {
        withdrawError.value = t('invite.withdraw.insufficientFunds');
        showToast(withdrawError.value, 'error');
        return;
      }
      
      // 检查是否达到最小提现金额
      if (amount < minWithdrawAmount.value && minWithdrawAmount.value > 0) {
        withdrawError.value = t('invite.withdraw.belowMinAmount', { 
          amount: currencySymbol.value + minWithdrawAmount.value + currency.value 
        });
        showToast(withdrawError.value, 'error');
        return;
      }
      
      withdrawLoading.value = true;
      
      try {
        // 将金额转换为分 (前端的元转为后端需要的分)
        const amountInCents = Math.round(amount * 100);
        
        // 调用提现API，注意参数顺序和名称
        const res = await withdrawCommission(
          amountInCents,
          withdrawAccount.value,
          selectedWithdrawMethod.value
        );
        
        if (res.data === true) {
          // 重置表单
          withdrawAccount.value = '';
          withdrawAmount.value = '';
          withdrawError.value = '';
          
          // 显示成功消息
          handleSuccess(t('invite.withdraw.success'));
          
          // 刷新数据
          await fetchInviteData();
          
          // 关闭弹窗
          showWithdrawCard.value = false;
        } else {
          // 显示API返回的错误信息
          withdrawError.value = res.message || t('invite.withdraw.failure');
          showToast(withdrawError.value, 'error');
        }
      } catch (error) {
        console.error('提现请求错误:', error);
        // 处理错误响应，优先显示API返回的具体错误信息
        if (error.response && error.response.data && error.response.data.message) {
          withdrawError.value = error.response.data.message;
        } else if (error.message) {
          withdrawError.value = error.message;
        } else {
          withdrawError.value = t('invite.withdraw.failure');
        }
        showToast(withdrawError.value, 'error');
      } finally {
        withdrawLoading.value = false;
      }
    };

    // 检测是否为移动设备
    const isMobile = ref(false); // 默认为桌面设备
    
    // 客户端初始化函数
    const initClientSideState = () => {
      // 确保在客户端环境中执行
      if (typeof window !== 'undefined') {
        isMobile.value = window.innerWidth <= 768;
      }
    };
    
    // 监听屏幕尺寸变化以更新页码显示
    const handleResize = () => {
      // 确保在客户端环境中执行
      if (typeof window !== 'undefined') {
        // 更新移动设备状态
        isMobile.value = window.innerWidth <= 768;
        // 强制重新计算displayPageNumbers
        nextTick(() => {
          // 触发计算属性重新计算
          displayPageNumbers.value;
        });
      }
    };
    
    // 监听点击事件关闭下拉框
    onMounted(() => {
      // 初始化客户端状态
      initClientSideState();
      
      // 这是第一个onMounted
      document.addEventListener('click', closeDropdownOnClickOutside);
      document.addEventListener('click', closePageSizeDropdownOnClickOutside);
      
      // 添加窗口大小变化监听（确保在客户端环境）
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
      }
      
      fetchInviteData();
      // 初始加载第一页数据
      currentPage.value = 1;
      fetchInviteDetails(1);
      fetchCommConfig();
      
      // 更新pageSize的值为配置中的值
      pageSize.value = INVITE_CONFIG.recordsPerPage || 10;
    });
    
    // 组件卸载时移除事件监听器
    onUnmounted(() => {
      document.removeEventListener('click', closeDropdownOnClickOutside);
      document.removeEventListener('click', closePageSizeDropdownOnClickOutside);
      window.removeEventListener('resize', handleResize);
    });
    
    // 提现相关状态
    const withdrawClose = ref(1); // 默认关闭提现
    const withdrawMethods = ref([]); // 提现方式列表
    const showWithdrawCard = ref(false); // 提现卡片显示状态
    const withdrawAccount = ref(''); // 提现账号
    const withdrawAmount = ref(''); // 提现金额
    const selectedWithdrawMethod = ref(''); // 选中的提现方式
    const showMethodDropdown = ref(false); // 下拉框显示状态
    const withdrawError = ref(''); // 提现错误信息
    const withdrawLoading = ref(false); // 提现加载状态
    const minWithdrawAmount = ref(0); // 最小提现金额
    
    // 新增状态用于控制卡片切换
    const pendingCardAction = ref(null);
    
    // 划转卡片隐藏完成后的回调
    const onTransferCardHidden = () => {
      if (pendingCardAction.value === 'withdraw') {
        pendingCardAction.value = null;
        showWithdrawCard.value = true;
        nextTick(() => {
          setTimeout(() => {
            const withdrawCard = document.querySelector('.withdraw-card');
            if (withdrawCard) {
              withdrawCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          }, 100);
        });
      }
    };
    
    // 提现卡片隐藏完成后的回调
    const onWithdrawCardHidden = () => {
      if (pendingCardAction.value === 'transfer') {
        pendingCardAction.value = null;
        showTransferCardState.value = true;
        nextTick(() => {
          setTimeout(() => {
            const transferCard = document.querySelector('.transfer-card');
            if (transferCard) {
              transferCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          }, 100);
        });
      }
    };
    
    // 处理成功消息显示（使用 i18n）
    const handleSuccess = (message) => {
      showToast(message, 'success');
    };
    
    // 处理错误消息显示（使用 i18n）
    const handleError = (error) => {
      console.error('Error:', error);
      const message = error.response?.message || t('common.error');
      showToast(message, 'error');
    };
    
    return {
      loading,
      creatingCode,
      inviteCodes,
      selectedCodeIndex,
      inviteStats,
      inviteRecords,
      inviteLink,
      currency,
      currencySymbol,
      copyInviteLink,
      createInviteCode,
      shareToWechat,
      shareToTwitter,
      shareToTelegram,
      shareToQQ,
      refreshRecords,
      formatDate,
      getStatusClass,
      getStatusText,
      showConfirmModal,
      confirmModalMessage,
      confirmAction,
      cancelConfirmation,
      prevInviteCode,
      nextInviteCode,
      formatCodeDate,
      showTransferCardState,
      transferAmount,
      transferError,
      transferLoading,
      isTransferDisabled,
      toggleTransferCard,
      confirmTransfer,
      withdrawClose,
      withdrawMethods,
      showWithdrawCard,
      withdrawAccount,
      withdrawAmount,
      selectedWithdrawMethod,
      showMethodDropdown,
      withdrawError,
      withdrawLoading,
      minWithdrawAmount,
      toggleWithdrawCard,
      closeWithdrawCard,
      toggleMethodDropdown,
      selectWithdrawMethod,
      submitWithdraw,
      onTransferCardHidden,
      onWithdrawCardHidden,
      handleSuccess,
      handleError,
      t, // 添加 t 函数到模板中使用
      currentPage,
      pageSize,
      totalRecords,
      paginatedRecords,
      handlePageChange,
      totalPages,
      displayPageNumbers, // 添加新的计算属性到返回对象
      pageSizeOptions,
      showPageSizeDropdown,
      togglePageSizeDropdown,
      selectPageSize,
      closePageSizeDropdownOnClickOutside,
      isMobile // 添加移动设备状态
    };
  }
};
</script>

<style lang="scss" scoped>
.account-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  
  .account-inner {
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
    position: relative;
    overflow: visible; // 允许溢出显示
    
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
      
      .card-actions {
        display: flex;
        gap: 10px;
      }
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
    
    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
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
      
      &:hover {
        border-color: rgba(var(--theme-color-rgb), 0.3);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
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
    }
  }
  
  .invite-codes-wrapper {
    margin-bottom: 25px;
  }
  
  .invite-cards-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 30px 0 20px;
    padding: 10px 0;
  }
  
  .invite-cards-nav {
    position: absolute;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: var(--card-bg-color);
    border: 1px solid var(--border-color);
    color: var(--theme-color);
    cursor: pointer;
    z-index: 5;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    &:hover {
      background-color: var(--theme-color);
      color: white;
      transform: scale(1.1);
    }
    
    &.prev {
      left: 0;
    }
    
    &.next {
      right: 0;
    }
  }
  
  .invite-cards-wrapper {
    position: relative;
    width: 100%;
    max-width: 600px;
    perspective: 1000px;
    overflow: hidden;
  }
  
  .invite-cards {
    position: relative;
    width: 100%;
    height: 140px;
    display: flex;
    justify-content: center;
  }
  
  .invite-card {
    position: absolute;
    width: calc(100% - 40px);
    height: 100%;
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    opacity: 0;
    backface-visibility: hidden;
    transform: translateX(60%) scale(0.8) rotateY(-10deg);
    pointer-events: none;
    
    &.active {
      opacity: 1;
      transform: translateX(0) scale(1) rotateY(0);
      z-index: 3;
      pointer-events: auto;
    }
    
    &.prev {
      opacity: 0.7;
      transform: translateX(-60%) scale(0.8) rotateY(10deg);
      z-index: 2;
    }
    
    &.next {
      opacity: 0.7;
      transform: translateX(60%) scale(0.8) rotateY(-10deg);
      z-index: 2;
    }
  }
  
  .invite-card-inner {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: var(--theme-color);
    color: white;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 10px rgba(var(--theme-color-rgb), 0.15);
    
    /* 添加简约风格覆盖层 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0.05),
        rgba(255, 255, 255, 0.02)
      );
      pointer-events: none;
    }
    
    .card-shine {
      display: none;
    }
    
    .card-decoration {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 120px;
      height: 120px;
      background: linear-gradient(
        to bottom right,
        rgba(255, 255, 255, 0.05),
        rgba(255, 255, 255, 0)
      );
      border-radius: 50%;
      opacity: 0.4;
      transform: translate(20%, 20%);
      pointer-events: none;
    }
    
    &:hover {
      box-shadow: 0 3px 12px rgba(var(--theme-color-rgb), 0.25);
      
      .card-shine {
        display: none;
      }
    }
  }
  
  .invite-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    position: relative;
    z-index: 2;
  }
  
  .invite-card-title {
    display: flex;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.3px;
    
    .card-icon {
      margin-right: 8px;
      opacity: 0.9;
    }
  }
  
  .invite-card-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .invite-code-display {
    font-size: 24px;
    font-weight: 500;
    letter-spacing: 1px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 10px 16px;
    display: flex;
    justify-content: center;
    position: relative;
    z-index: 2;
    
    &::before, &::after {
      display: none;
    }
    
    .code-char {
      display: inline-block;
      animation: fadeIn 0.4s both;
      animation-delay: calc(var(--i, 0) * 0.04s);
      
      @for $i from 0 through 10 {
        &:nth-child(#{$i + 1}) {
          --i: #{$i};
        }
      }
    }
  }
  
  .invite-card-footer {
    margin-top: auto;
    padding-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    position: relative;
    z-index: 2;
    
    .card-label {
      font-size: 12px;
      font-weight: 500;
      opacity: 0.8;
      margin-top: 8px;
    }
    
    .invite-card-date {
      font-size: 11px;
      opacity: 0.7;
    }
  }
  
  .invite-cards-indicators {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
    
    .indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--border-color);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &.active {
        width: 24px;
        border-radius: 4px;
        background-color: var(--theme-color);
      }
      
      &:hover:not(.active) {
        background-color: var(--secondary-text-color);
      }
    }
  }
  
  .invite-link-wrapper {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    margin-bottom: 20px;
    
    .input-with-icon {
      position: relative;
      flex: 1;
      
      .input-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--secondary-text-color);
        width: 18px;
        height: 18px;
        opacity: 0.8;
        pointer-events: none;
      }
      
      .invite-link {
        width: 100%;
        height: 42px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
        background-color: var(--input-bg-color, rgba(0, 0, 0, 0.03));
        padding: 0 15px 0 40px;
      color: var(--text-color);
      font-size: 14px;
        transition: all 0.3s ease;
        outline: none;
        box-sizing: border-box;
        
        &:focus {
          border-color: var(--theme-color);
          box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.15);
        }
        
        &::placeholder {
          color: var(--placeholder-color, #aaa);
        }
        
        &:hover:not(:focus) {
          border-color: rgba(var(--theme-color-rgb), 0.3);
          background-color: var(--input-hover-bg-color, rgba(0, 0, 0, 0.05));
        }
        
        &:read-only {
          cursor: pointer;
        }
      }
    }
  }
  
  .share-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    
    .btn-outline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 42px;
      padding: 0 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background-color: transparent;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--theme-color);
        color: var(--theme-color);
        background-color: rgba(var(--theme-color-rgb), 0.05);
        transform: translateY(-1px);
      }
      
      .btn-icon {
        width: 18px;
        height: 18px;
      }
    }
    
    .wechat-btn:hover {
      border-color: #07c160;
      color: #07c160;
      background-color: rgba(7, 193, 96, 0.05);
    }
    
    .qq-btn:hover {
      border-color: #12b7f5;
      color: #12b7f5;
      background-color: rgba(18, 183, 245, 0.05);
    }
    
    .twitter-btn:hover {
      border-color: #1da1f2;
      color: #1da1f2;
      background-color: rgba(29, 161, 242, 0.05);
    }
    
    .telegram-btn:hover {
      border-color: #0088cc;
      color: #0088cc;
      background-color: rgba(0, 136, 204, 0.05);
    }
  }
  
  .rules-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (min-width: 992px) {
      grid-template-columns: repeat(4, 1fr);
    }
    
    .rule-item {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 15px;
      border-radius: 10px;
      background-color: rgba(var(--border-color-rgb), 0.05);
      transition: all 0.3s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.05);
      }
      
      .rule-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 10px;
        background-color: rgba(var(--theme-color-rgb), 0.1);
        color: var(--theme-color);
      }
      
      .rule-content {
        flex: 1;
        
        h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 5px;
          color: var(--text-color);
        }
        
        p {
          font-size: 14px;
          color: var(--secondary-text-color);
          margin: 0;
        }
      }
    }
  }
  
  .records-table-wrapper {
    width: 100%;
    overflow-x: auto;
    margin-bottom: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    background-color: var(--card-bg-color);
    
    .records-table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 15px 20px;
        text-align: left;
        border-bottom: 1px solid var(--border-light-color);
        white-space: nowrap; /* 防止文本换行 */
        overflow: hidden;
        text-overflow: ellipsis; /* 超出部分显示省略号 */
        max-width: 200px; /* 设置最大宽度 */
      }
      
      th {
        font-weight: 600;
        color: var(--text-color);
        background-color: var(--card-header-bg);
        position: sticky;
        top: 0;
        z-index: 10;
        font-size: 15px;
        text-transform: capitalize;
        border-bottom: 2px solid var(--border-color);
      }
      
      td {
        font-size: 14px;
        color: var(--text-color);
        transition: all 0.2s ease;
      }
      
      tbody tr {
        transition: background-color 0.3s;
        
        &:hover {
          background-color: rgba(var(--theme-color-rgb), 0.05);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        &:last-child td {
          border-bottom: none;
        }
      }
      
      /* 美化金额列 */
      td:nth-child(2), td:nth-child(3) {
        font-weight: 600;
        font-size: 15px;
      }
      
      /* 强调佣金列 */
      td:nth-child(3) {
        color: var(--theme-color);
      }
      
      .status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        min-width: 80px;
        text-align: center;
        
        &.confirmed {
          background-color: rgba(76, 175, 80, 0.1);
          color: #4caf50;
          border: 1px solid rgba(76, 175, 80, 0.2);
        }
        
        &.pending {
          background-color: rgba(255, 152, 0, 0.1);
          color: #ff9800;
          border: 1px solid rgba(255, 152, 0, 0.2);
        }
        
        &.waiting {
          background-color: rgba(33, 150, 243, 0.1);
          color: #2196f3;
          border: 1px solid rgba(33, 150, 243, 0.2);
        }
        
        &.invalid {
          background-color: rgba(244, 67, 54, 0.1);
          color: #f44336;
          border: 1px solid rgba(244, 67, 54, 0.2);
        }
      }
    }
    
    /* 响应式调整 */
    @media (max-width: 768px) {
      .records-table {
        th, td {
          padding: 12px 15px;
          font-size: 13px;
        }
        
        td:nth-child(2), td:nth-child(3) {
          font-size: 14px;
          font-weight: 600;
        }
        
        .status-badge {
          padding: 4px 8px;
          font-size: 12px;
          min-width: 70px;
        }
      }
    }
    
    .empty-records {
      padding: 40px 20px;
      text-align: center;
      color: var(--secondary-text-color);
      background-color: var(--card-bg-color);
      border-radius: 8px;
      border: 1px dashed var(--border-color);
      font-size: 15px;
      
      &::before {
        content: '📋';
        display: block;
        font-size: 32px;
        margin-bottom: 15px;
        opacity: 0.5;
      }
    }
  }
  
  .no-invite-code {
    padding: 30px;
    text-align: center;
    color: var(--secondary-text-color);
    
    .create-code-btn {
      margin-top: 16px;
      
      .create-btn-content {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }
  }
}

/* 按钮样式 */
.btn-primary, .btn-outline, .btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-sizing: border-box;
  
  .btn-icon {
    width: 16px;
    height: 16px;
    display: inline-flex; /* 确保图标正确显示 */
    vertical-align: middle; /* 垂直居中 */
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-primary {
  height: 42px;
  min-width: 110px;
  padding: 0 16px;
  background-color: var(--theme-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(var(--theme-color-rgb), 0.2);
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background-color: var(--theme-hover-color, #3070e0);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(var(--theme-color-rgb), 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-outline {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  
  &:hover:not(:disabled) {
    border-color: var(--theme-color);
    color: var(--theme-color);
    transform: translateY(-1px);
  }
}

.btn-action {
  background-color: transparent;
  color: var(--secondary-text-color);
  border: none;
  padding: 5px 10px;
  font-size: 13px;
  
  &:hover:not(:disabled) {
    color: var(--theme-color);
    background-color: rgba(var(--theme-color-rgb), 0.05);
  }
  
  .action-icon {
    width: 16px;
    height: 16px;
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}

/* 骨架屏样式 */
.skeleton-loading {
  overflow: hidden;
  position: relative;
  border-radius: 5px;
  
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
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 2s infinite;
    z-index: 1;
    border-radius: inherit;
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.skeleton-card {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  display: flex !important;
  align-items: center;
  padding: 16px;
  
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
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 2s infinite;
    z-index: 1;
    border-radius: inherit;
  }
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  margin-right: 16px;
  flex-shrink: 0;
  position: relative;
}

.skeleton-row {
  height: 16px;
  margin-bottom: 16px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.skeleton-row-sm {
  height: 16px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  width: 80%;
  margin-bottom: 10px;
  position: relative;
  overflow: hidden;
}

.skeleton-row-xs {
  height: 12px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  width: 50%;
  position: relative;
  overflow: hidden;
}

.skeleton-header-cell {
  height: 16px;
  flex: 1;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  overflow: hidden;
}

.skeleton-cell {
  height: 16px;
  flex: 1;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  overflow: hidden;
}

.skeleton-row-full {
  display: flex;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  gap: 12px;
}

.skeleton-table {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-header-row {
  display: flex;
  padding: 12px 16px;
  background-color: rgba(var(--border-color-rgb), 0.05);
  gap: 12px;
}

/* 暗色模式下的骨架屏调整 */
.dark-theme .skeleton-header-cell,
.dark-theme .skeleton-cell,
.dark-theme .skeleton-icon,
.dark-theme .skeleton-row,
.dark-theme .skeleton-row-sm,
.dark-theme .skeleton-row-xs {
  background-color: rgba(255, 255, 255, 0.08);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .account-container {
    padding: 15px;
    padding-bottom: 80px; /* 为底部导航栏预留空间 */
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .invite-link-wrapper {
      flex-direction: column;
      margin-bottom: 15px;
      
      .input-with-icon {
        width: 100%;
      
      .invite-link {
        width: 100%;
        }
      }
      
      .btn-primary {
        width: 100%;
        margin-top: 10px;
      }
    }
    
    .share-buttons {
      .btn-outline {
        flex: 1;
        min-width: calc(50% - 5px);
      }
    }
  }
}

/* 暗色模式适配 - 使用特定类名选择器 */
.dark-theme .invite-code-tabs,
.dark .invite-code-tabs {
  background-color: rgba(255, 255, 255, 0.05);
  
  .invite-code-tab {
    background-color: rgba(30, 30, 30, 0.7);
    
    &.active {
      background-color: var(--card-bg-color);
    }
    
    &:hover:not(.active) {
      background-color: rgba(40, 40, 40, 0.9);
    }
  }
}

/* 完善移动端适配 */
@media (max-width: 768px) {
  .invite-code-tabs {
    padding: 10px;
    gap: 8px;
    justify-content: flex-start;
  }
  
  .invite-code-tab {
    flex: 0 0 calc(50% - 8px);
    min-width: calc(50% - 8px);
    padding: 8px 12px;
    
    .tab-code {
      font-size: 0.9rem;
    }
    
    .tab-visits {
      font-size: 0.75rem;
    }
  }
  
  .share-buttons {
    gap: 8px;
    flex-wrap: wrap;
    justify-content: space-between;
    
    .btn-outline {
      flex: 0 0 calc(50% - 4px);
      min-width: calc(50% - 4px);
      margin: 0 0 8px 0;
      padding: 8px 5px;
      font-size: 0.9rem;
      
      .btn-icon {
        width: 16px;
        height: 16px;
      }
    }
  }
}

/* 加载动画 */
.loading-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 6px;
  vertical-align: -3px;
}

.loader {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 在卡片头部按钮中的加载动画样式调整 */
.card-actions .btn-action .loading-icon {
  border: 2px solid rgba(var(--theme-color-rgb), 0.3);
  border-top-color: var(--theme-color);
}

/* 暗黑模式适配 */
.dark-theme, .dark {
  .invite-link-wrapper .input-with-icon .invite-link {
    background-color: var(--input-bg-color, rgba(255, 255, 255, 0.08));
    border-color: var(--border-color, rgba(255, 255, 255, 0.12));
    
    &:hover:not(:focus) {
      background-color: var(--input-hover-bg-color, rgba(255, 255, 255, 0.12));
      border-color: rgba(var(--theme-color-rgb), 0.4);
    }
    
    &::placeholder {
      color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
    }
  }
  
  .btn-primary {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    
    &:hover:not(:disabled) {
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    }
  }
  
  .share-buttons .btn-outline {
    border-color: var(--border-color, rgba(255, 255, 255, 0.15));
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.15);
    }
  }
  
  .loading-icon {
    border-color: rgba(255, 255, 255, 0.2);
    
    &.dark-loader {
      border-color: rgba(0, 0, 0, 0.2);
      border-top-color: var(--theme-color);
    }
  }
  
  /* 划转卡片暗色模式样式 */
  .transfer-card {
    background-color: var(--card-bg-color);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    
    .alert.alert-warning {
      background-color: rgba(255, 152, 0, 0.1);
      border-color: rgba(255, 152, 0, 0.25);
      
      .alert-icon {
        color: #ff9800;
        filter: drop-shadow(0 1px 3px rgba(255, 152, 0, 0.3));
      }
      
      .alert-desc {
        color: #ff9800;
      }
    }
    
    .input-with-prefix {
      .input-prefix {
        background-color: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .form-control {
        background-color: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: var(--text-color);
        
        &:hover:not(:focus) {
          background-color: rgba(255, 255, 255, 0.08);
        }
        
        &:focus {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    }
    
    .form-hint::before {
      opacity: 0.8;
    }
  }
  
  /* 余额卡片暗色模式样式 */
  .balance-card {
    &:hover {
      border-color: rgba(var(--theme-color-rgb), 0.3);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
    }
    
    .balance-value::before {
      opacity: 0.8;
    }
  }
  
  /* 暗黑模式下的弹窗样式调整 */
  .modal-container {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    background-color: var(--card-bg-color);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

/* 自定义弹窗样式 */
.custom-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-content {
  background-color: var(--card-background);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--theme-color-rgb), 0.15);
  animation: modal-fade-in 0.2s ease-out;
  position: relative;
}

@keyframes modal-fade-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, rgba(var(--theme-color-rgb), 0.05), transparent);
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: var(--card-background);
  
  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 10px;
    
    &::before {
      content: '';
      display: block;
      width: 4px;
      height: 18px;
      background-color: var(--theme-color);
      border-radius: 2px;
    }
  }
  
  .modal-close {
    background: none;
    border: none;
    color: var(--secondary-text-color);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
    margin: -8px;
    z-index: 10;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--text-color);
      transform: rotate(90deg);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  max-height: calc(90vh - 140px);
  
  p {
    color: var(--text-color);
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 16px;
  }
  
  .alert {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    border-radius: 12px;
    padding: 16px;
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
    }
    
    .alert-icon {
      flex-shrink: 0;
      margin-right: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .alert-content {
      flex: 1;
    }
    
    &.alert-warning {
      background-color: rgba(255, 152, 0, 0.08);
      border: 1px solid rgba(255, 152, 0, 0.2);
      
      &::before {
        background-color: #ff9800;
      }
      
      .alert-icon {
        color: #ff9800;
        filter: drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3));
      }
      
      .alert-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #ff9800;
        font-size: 15px;
      }
      
      .alert-desc {
        color: var(--text-color);
        opacity: 0.9;
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }
  
  .form-group {
    margin-bottom: 20px;
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-color);
    }
    
    .input-with-prefix, .account-input {
      display: flex;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      
      &:focus-within {
        border-color: var(--theme-color);
        box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.15);
      }
      
      .input-prefix {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 12px;
        background-color: rgba(var(--theme-color-rgb), 0.08);
        color: var(--text-color);
        font-weight: 500;
        border-right: 1px solid var(--border-color);
      }
      
      .form-control {
        flex: 1;
        padding: 12px 16px;
        border: none;
        background-color: transparent;
        color: var(--text-color);
        font-size: 16px;
        outline: none;
        
        &::placeholder {
          color: var(--text-muted);
          opacity: 0.7;
        }
      }
    }
    
    .form-hint {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-muted);
      
      .min-withdraw-hint {
        color: var(--warning-color);
        margin-left: 4px;
        font-weight: 500;
      }
    }
    
    .error-message {
      margin-top: 8px;
      color: #f44336;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
      
      &::before {
        content: '!';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        background-color: #f44336;
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
      }
    }
  }
}

.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  
  button {
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &.btn-cancel {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
        transform: translateY(-2px);
      }
    }
    
    &.btn-submit {
      background-color: var(--theme-color);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 100px;
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.3);
      
      &:hover:not(:disabled) {
        background-color: rgba(var(--theme-color-rgb), 0.9);
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.4);
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        box-shadow: none;
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

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* 提现方法样式 */
.withdraw-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  width: 100%;
  
  .withdraw-method {
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid var(--border-color);
    background-color: rgba(var(--theme-color-rgb), 0.02);
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.08);
      transform: translateY(-2px);
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
    }
    
    &.active {
      background-color: transparent;
      color: var(--theme-color);
      border-color: var(--theme-color);
      border-width: 2px;
      font-weight: 600;
    }
  }
}

/* 移动端适配优化 */
@media (max-width: 768px) {
  .modal-container {
    width: 95%;
  }
}

/* 添加新的 CSS 样式 */
.invite-cards-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30px 0 20px;
  padding: 10px 0;
}

.invite-cards-nav {
  position: absolute;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  color: var(--theme-color);
  cursor: pointer;
  z-index: 5;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background-color: var(--theme-color);
    color: white;
    transform: scale(1.1);
  }
  
  &.prev {
    left: 0;
  }
  
  &.next {
    right: 0;
  }
}

.invite-cards-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  perspective: 1000px;
  overflow: hidden;
}

.invite-cards {
  position: relative;
  width: 100%;
  height: 140px;
  display: flex;
  justify-content: center;
}

.invite-card {
  position: absolute;
  width: calc(100% - 40px);
  height: 100%;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  opacity: 0;
  backface-visibility: hidden;
  transform: translateX(60%) scale(0.8) rotateY(-10deg);
  pointer-events: none;
  
  &.active {
    opacity: 1;
    transform: translateX(0) scale(1) rotateY(0);
    z-index: 3;
    pointer-events: auto;
  }
  
  &.prev {
    opacity: 0.7;
    transform: translateX(-60%) scale(0.8) rotateY(10deg);
    z-index: 2;
  }
  
  &.next {
    opacity: 0.7;
    transform: translateX(60%) scale(0.8) rotateY(-10deg);
    z-index: 2;
  }
}

.invite-card-inner {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: var(--theme-color);
  color: white;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(var(--theme-color-rgb), 0.15);
  
  /* 添加简约风格覆盖层 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0.02)
    );
    pointer-events: none;
  }
  
  .card-shine {
    display: none;
  }
  
  .card-decoration {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 120px;
    height: 120px;
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0)
    );
    border-radius: 50%;
    opacity: 0.4;
    transform: translate(20%, 20%);
    pointer-events: none;
  }
  
  &:hover {
    box-shadow: 0 3px 12px rgba(var(--theme-color-rgb), 0.25);
    
    .card-shine {
      display: none;
    }
  }
}

.invite-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
}

.invite-card-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
  
  .card-icon {
    margin-right: 8px;
    opacity: 0.9;
  }
}

.invite-card-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.invite-code-display {
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 2;
  
  &::before, &::after {
    display: none;
  }
  
  .code-char {
    display: inline-block;
    animation: fadeIn 0.4s both;
    animation-delay: calc(var(--i, 0) * 0.04s);
    
    @for $i from 0 through 10 {
      &:nth-child(#{$i + 1}) {
        --i: #{$i};
      }
    }
  }
}

.invite-card-footer {
  margin-top: auto;
  padding-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  position: relative;
  z-index: 2;
  
  .card-label {
    font-size: 12px;
    font-weight: 500;
    opacity: 0.8;
    margin-top: 8px;
  }
  
  .invite-card-date {
    font-size: 11px;
    opacity: 0.7;
  }
}

/* 卡片切换动画 */
.invite-card-enter-active,
.invite-card-leave-active {
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.invite-card-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.invite-card-leave-to {
  opacity: 0;
  transform: translateX(-100%) scale(0.8);
}

@keyframes fadeIn {
  from { 
    opacity: 0;
    transform: translateY(4px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
  
  .modal-container {
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  }
  
  .modal-overlay {
    transition: opacity 0.3s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  
  .modal-container {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  
  .modal-overlay {
    opacity: 0;
  }
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
  
  .modal-container {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  
  .modal-overlay {
    opacity: 1;
  }
}

/* 移动端和暗黑模式适配 */
.invite-cards-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--border-color);
    cursor: pointer;
    transition: all 0.3s ease;
    
    &.active {
      width: 24px;
      border-radius: 4px;
      background-color: var(--theme-color);
    }
    
    &:hover:not(.active) {
      background-color: var(--secondary-text-color);
    }
  }
}

/* 暗黑模式适配 */
.dark-theme, .dark {
  .invite-cards-nav {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    
    &:hover {
      background-color: var(--theme-color);
    }
  }
  
  .invite-cards-indicators .indicator {
    background-color: rgba(255, 255, 255, 0.2);
    
    &:hover:not(.active) {
      background-color: rgba(255, 255, 255, 0.4);
    }
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .invite-cards {
    height: 170px;
  }
  
  .invite-cards-nav {
    width: 32px;
    height: 32px;
    
    &.prev {
      left: -5px;
    }
    
    &.next {
      right: -5px;
    }
  }
  
  .invite-card {
    width: calc(100% - 20px);
  }
  
  .invite-card-inner {
    padding: 15px;
  }
  
  .invite-card-title {
    font-size: 16px;
  }
  
  .invite-code-display {
    font-size: 18px;
    padding: 8px 12px;
  }
  
  .invite-card-footer {
    padding-top: 10px;
    flex-direction: column;
    align-items: flex-start;
    
    .invite-card-date {
      margin-top: 5px;
    }
  }
}

/* 佣金余额卡片样式 */
.balance-card {
  transition: all 0.3s ease;
  
  &:hover {
    transform: none;
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.07);
    border-color: rgba(var(--theme-color-rgb), 0.2);
  }
}

.balance-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .balance-info {
    .balance-label {
      font-size: 14px;
      color: var(--secondary-text-color);
      margin-bottom: 6px;
      font-weight: 500;
    }
    
    .balance-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--theme-color);
      margin-bottom: 10px;
      letter-spacing: -0.5px;
      display: flex;
      align-items: baseline;
    }
    
    .balance-description {
      font-size: 13px;
      color: var(--secondary-text-color);
      max-width: 360px;
      line-height: 1.5;
    }
  }
  
  .balance-actions {
    display: flex;
    gap: 10px;
    
    .btn-primary {
      height: 44px;
      font-weight: 600;
      letter-spacing: 0.3px;
      padding: 0 20px;
      border-radius: 10px;
      min-width: 140px;
      box-shadow: 0 2px 8px rgba(var(--theme-color-rgb), 0.25);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.35);
      }
    }
    
    @media (max-width: 768px) {
      width: 100%;
      margin-top: 10px;
      
      .btn-primary {
        width: 100%;
        justify-content: center;
      }
    }
  }
}

/* 划转卡片样式 */
.transfer-card {
  margin-bottom: 24px;
  overflow: hidden;
  will-change: transform, opacity;
  transform-origin: top center;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--card-bg-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-color);
    
    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    
    .close-btn {
      background: transparent;
      border: none;
      color: var(--secondary-text-color);
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.1);
        color: var(--theme-color);
      }
    }
  }
  
  .card-body {
    padding: 20px;
  }
  
  .alert {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    border-radius: 12px;
    padding: 16px;
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
    }
    
    .alert-icon {
      flex-shrink: 0;
      margin-right: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .alert-content {
      flex: 1;
    }
    
    &.alert-warning {
      background-color: rgba(255, 152, 0, 0.08);
      border: 1px solid rgba(255, 152, 0, 0.2);
      
      &::before {
        background-color: #ff9800;
      }
      
      .alert-icon {
        color: #ff9800;
        filter: drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3));
      }
      
      .alert-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #ff9800;
        font-size: 15px;
      }
      
      .alert-desc {
        color: var(--text-color);
        opacity: 0.9;
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }
  
  .transfer-form {
    .form-group {
      margin-bottom: 16px;
      
      .form-label {
        display: block;
        font-size: 14px;
        margin-bottom: 6px;
        color: var(--text-color);
        font-weight: 500;
      }
      
      .input-with-prefix {
        display: flex;
        align-items: stretch;
        width: 100%;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        overflow: hidden;
        
        .input-prefix {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          background-color: rgba(var(--border-color-rgb), 0.1);
          border: 1px solid var(--border-color);
          border-right: none;
          border-radius: 8px 0 0 8px;
          color: var(--text-color);
          font-weight: 500;
          min-width: 36px;
        }
        
        .form-control {
          flex: 1;
          height: 42px;
          border-radius: 0 8px 8px 0;
          border: 1px solid var(--border-color);
          background-color: var(--input-bg-color, rgba(0, 0, 0, 0.03));
          padding: 0 15px;
          color: var(--text-color);
          font-size: 14px;
          transition: all 0.3s ease;
          outline: none;
          font-weight: 500;
          
          &:focus {
            border-color: var(--theme-color);
            box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.15);
          }
          
          &::placeholder {
            color: var(--placeholder-color, #aaa);
            font-weight: normal;
          }
          
          &:hover:not(:focus) {
            border-color: rgba(var(--theme-color-rgb), 0.3);
            background-color: var(--input-hover-bg-color, rgba(0, 0, 0, 0.05));
          }
          
          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
      
      .form-hint {
        margin-top: 8px;
        font-size: 12px;
        color: var(--secondary-text-color);
        display: flex;
        align-items: center;
        
        &::before {
          content: "";
          margin-right: 0;
          font-size: 0;
          display: none;
        }
      }
      
      .error-message {
        margin-top: 8px;
        font-size: 12px;
        color: var(--error-color, #f44336);
        display: flex;
        align-items: center;
        
        &::before {
          content: "";
          margin-right: 0;
          font-size: 0;
          display: none;
        }
      }
    }
    
    .btn-block {
      width: 100%;
      margin-top: 10px;
      height: 44px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
      transition: all 0.25s ease;
      border-radius: 8px;
      
      &:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(var(--theme-color-rgb), 0.3);
      }
      
      &:not(:disabled):active {
        transform: translateY(0);
      }
      
      &:disabled {
        opacity: 0.65;
      }
    }
  }
}

/* 划转卡片动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  will-change: opacity, transform;
  backface-visibility: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 自定义下拉选择框样式 */
.custom-select {
  position: relative;
  width: 100%;
  height: 42px;
  background-color: var(--input-bg-color, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
}

.custom-select:hover {
  background-color: var(--input-hover-bg-color, rgba(0, 0, 0, 0.05));
  border-color: rgba(var(--theme-color-rgb), 0.3);
}

.select-value {
  font-size: 14px;
  color: var(--text-color);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

  .select-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text-color);
    transition: transform 0.3s ease;
    margin-left: 4px;
  }
  
  .select-icon svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s ease;
  }
  
  .select-icon .rotate-180 {
    transform: rotate(180deg);
  }

  .select-dropdown {
    position: absolute;
    bottom: calc(100% + 5px); /* 改为向上展开 */
    left: 0;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--card-bg-color, #1e1e1e);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    z-index: 3001; // 高于 page-size-selector
    padding: 5px 0;
  }
  
  /* 淡入淡出过渡效果 */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(5px); /* 改为向上的动画效果 */
  }

  .select-option {
    padding: 8px 15px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-color);
    transition: all 0.2s ease;
    text-align: center;
  }
  
  .select-option:hover, .select-option.selected {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    color: var(--theme-color);
  }

/* 提现按钮样式 */
.withdraw-btn {
  background: transparent !important;
  border: 1.5px solid var(--theme-color) !important;
  color: var(--theme-color) !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .btn-icon {
    color: var(--theme-color);
  }
}

/* 提现平台标签样式 */
.withdraw-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.method-tag {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  
  &:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
    background-color: rgba(var(--theme-color-rgb), 0.05);
  }
  
  &.active {
    background-color: var(--theme-color);
    color: white;
    border-color: var(--theme-color);
  }
}

/* 暗黑模式适配 */
.dark-theme, .dark {
  .method-tag {
    border-color: rgba(255, 255, 255, 0.1);
    
    &:hover {
      border-color: var(--theme-color);
      background-color: rgba(var(--theme-color-rgb), 0.15);
    }
  }
}

.account-input {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  
  &:focus-within {
    border-color: var(--theme-color);
    box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.15);
  }
  
  .input-prefix {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    background-color: rgba(var(--theme-color-rgb), 0.08);
    color: var(--text-color);
    font-weight: 500;
    border-right: 1px solid var(--border-color);
  }
  
  .form-control {
    flex: 1;
    padding: 12px 16px;
    border: none;
    background-color: transparent;
    color: var(--text-color);
    font-size: 16px;
    outline: none;
    
    &::placeholder {
      color: var(--text-muted);
      opacity: 0.7;
    }
  }
}

/* 分页控件样式 */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  padding: 10px 0;
  gap: 6px;
  
  .page-size-container {
    margin-left: 15px;
    display: flex;
    align-items: center;
  }
  
  .page-size-selector {
    width: 70px;
    height: 36px;
    position: relative;
    z-index: 3000; // 高于其它卡片
    display: inline-flex;
  }
  
  .page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      border-color: var(--theme-color);
      color: var(--theme-color);
      background-color: rgba(var(--theme-color-rgb), 0.05);
    }
    
    &.active {
      color: var(--theme-color);
      border-color: var(--theme-color);
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(var(--theme-color-rgb), 0.2);
      background-color: rgba(var(--theme-color-rgb), 0.05);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .page-numbers {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .page-ellipsis {
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text-color);
    font-size: 12px;
    user-select: none;
  }
  
  .prev-btn, .next-btn {
    background-color: rgba(var(--theme-color-rgb), 0.05);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .pagination-controls {
    flex-wrap: nowrap;
    justify-content: center;
    gap: 8px;
    
    .page-btn {
      width: 32px;
      height: 32px;
      font-size: 13px;
    }
    
    .page-numbers {
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .page-ellipsis {
      width: 16px;
    }
    
    .page-size-container {
      margin-top: 0;
      margin-left: 8px;
    }
    
    .page-size-selector {
      height: 32px;
      width: 70px;
    }
  }
  
  .records-table-wrapper {
    overflow-x: auto;
    
    .records-table {
      min-width: 500px; /* Ensure the table has a minimum width on mobile */
      
      th, td {
        white-space: nowrap;
        padding: 10px 12px;
        font-size: 13px;
      }
    }
  }
}

/* 添加新的 CSS 样式 */
.page-size-selector {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  
  &:hover {
    background-color: var(--input-hover-bg-color, rgba(0, 0, 0, 0.05));
    border-color: rgba(var(--theme-color-rgb), 0.3);
  }
  
  .select-value {
    font-size: 14px;
    color: var(--text-color);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .select-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text-color);
    transition: transform 0.3s ease;
    margin-left: 4px;
  }
  
  .select-icon svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s ease;
  }
  
  .select-icon .rotate-180 {
    transform: rotate(180deg);
  }
  
  .select-dropdown {
    position: absolute;
    bottom: calc(100% + 5px); /* 改为向上展开 */
    left: 0;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--card-bg-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    z-index: 3001; // 高于 page-size-selector
    padding: 5px 0;
  }
  
  /* 淡入淡出过渡效果 */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(5px); /* 改为向上的动画效果 */
  }

  .select-option {
    padding: 12px 15px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-color);
    transition: all 0.2s ease;
    text-align: center;
  }
  
  .select-option:hover, .select-option.selected {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    color: var(--theme-color);
  }
}
</style> 