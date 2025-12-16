<template>
  <div class="payment-container">
    <div class="payment-inner">
      <!-- 标题栏 -->
      <div class="dashboard-card title-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('payment.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('payment.description') }}</p>
        </div>
      </div>
      
      <div class="content-wrapper">
        <!-- 左侧内容：产品信息 -->
        <div class="left-column">
          <!-- 产品信息 -->
          <div class="section-wrapper">
            <div class="section-title">
              <span>{{ $t('payment.product_info') }}</span>
            </div>
            
            <div class="product-info" v-if="!loading.order">
              <!-- 充值订单时显示简化信息 -->
              <div v-if="orderDetail.period === 'deposit'">
                <div class="info-row">
                  <div class="info-label">{{ $t('wallet.deposit.title') }}</div>
                  <div class="info-value">{{ formatAmount(orderDetail.total_amount) }}</div>
                </div>
              </div>
              <!-- 普通订单显示完整信息 -->
              <div v-else>
                <div class="info-row">
                  <div class="info-label">{{ $t('payment.plan_name') }}</div>
                  <div class="info-value">{{ orderDetail.plan?.name || '-' }}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">{{ $t('payment.period') }}</div>
                  <div class="info-value">{{ formatPeriod(orderDetail.period) }}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">{{ $t('payment.traffic') }}</div>
                  <div class="info-value">{{ formatTraffic(orderDetail.plan?.transfer_enable) }}</div>
                </div>
              </div>
            </div>
            
            <!-- 产品信息骨架屏 -->
            <div class="skeleton-card" v-else>
              <div class="skeleton-text" v-for="i in 3" :key="'product-'+i"></div>
            </div>
          </div>
          
          <!-- 订单信息 -->
          <div class="section-wrapper">
            <div class="section-title">
              <span>{{ $t('payment.order_info') }}</span>
            </div>
            
            <div class="order-info" v-if="!loading.order">
              <div class="info-row">
                <div class="info-label">{{ $t('payment.trade_no') }}</div>
                <div class="info-value">{{ orderDetail.trade_no || '-' }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">{{ $t('payment.created_at') }}</div>
                <div class="info-value">{{ formatDate(orderDetail.created_at) }}</div>
              </div>
              
              <!-- 充值订单显示充值金额 -->
              <div v-if="orderDetail.period === 'deposit'" class="info-row">
                <div class="info-label">{{ $t('wallet.deposit.title') }}</div>
                <div class="info-value amount">{{ formatAmount(orderDetail.total_amount) }}</div>
              </div>
              <!-- 普通订单显示套餐金额 -->
              <div v-else class="info-row">
                <div class="info-label">{{ $t('payment.total_price') }}</div>
                <div class="info-value amount">{{ formatAmount(getPlanPrice()) }}</div>
              </div>
              
              <div class="info-row discount-row" v-if="orderDetail.discount_amount > 0">
                <div class="info-label">{{ $t('payment.discount_amount') }}</div>
                <div class="info-value discount">-{{ formatAmount(orderDetail.discount_amount) }}</div>
              </div>
              <div class="info-row" v-if="orderDetail.balance_amount !== null && orderDetail.balance_amount !== undefined && orderDetail.balance_amount > 0">
                <div class="info-label">{{ $t('payment.use_credit') }}</div>
                <div class="info-value discount">-{{ formatAmount(orderDetail.balance_amount) }}</div>
              </div>
              <div class="info-row" v-if="orderDetail.refund_amount !== null && orderDetail.refund_amount !== undefined && orderDetail.refund_amount > 0">
                <div class="info-label">{{ $t('payment.refund_amount') }}</div>
                <div class="info-value">{{ formatAmount(orderDetail.refund_amount) }}</div>
              </div>
              <div class="info-row" v-if="selectedMethod && handleFeeAmount > 0">
                <div class="info-label">{{ $t('payment.handling_fee') }}</div>
                <div class="info-value fee">{{ formatAmount(handleFeeAmount) }}</div>
              </div>
              <div class="info-row final-row">
                <div class="info-label">{{ $t('payment.total_with_fee') }}</div>
                <div class="info-value final">{{ formatAmount(totalWithFee) }}</div>
              </div>
            </div>
            
            <!-- 订单信息骨架屏 -->
            <div class="skeleton-card" v-else>
              <div class="skeleton-text" v-for="i in 5" :key="'order-'+i"></div>
            </div>
          </div>
        </div>
        
        <!-- 右侧内容：支付方式 -->
        <div class="right-column">
          <!-- 新增：订单状态卡片 -->
          <div class="section-wrapper order-status">
            <div class="section-title">
              <span>{{ $t('payment.order_status') }}</span>
            </div>
            
            <div class="status-info" v-if="!loading.order">
              <div class="order-status-notice" :class="getStatusClass(orderDetail.status)">
                <div class="status-icon">
                  <IconClock v-if="orderDetail.status === 0 && orderDetail.total_amount > 0" :size="48" />
                  <IconClock v-else-if="orderDetail.status === 0 && orderDetail.total_amount === 0" :size="48" />
                  <IconLoader2 v-else-if="orderDetail.status === 1" :size="48" class="rotating-icon" />
                  <IconX v-else-if="orderDetail.status === 2" :size="48" />
                  <IconCheck v-else-if="orderDetail.status === 3" :size="48" />
                  <IconCheck v-else-if="orderDetail.status === 4" :size="48" />
                  <IconHelp v-else :size="48" />
                </div>
                <div class="status-text">
                  <h3 v-if="orderDetail.status === 0 && orderDetail.total_amount === 0" class="activate-status">{{ $t('payment.status.activate') }}</h3>
                  <h3 v-else>{{ getStatusText(orderDetail.status) }}</h3>
                  <p v-if="orderDetail.status === 0 && orderDetail.total_amount > 0">{{ $t('payment.description') }}</p>
                  <p v-else-if="orderDetail.status === 1">{{ $t('payment.payment_processing') }}</p>
                  <p v-else-if="orderDetail.status === 2">{{ $t('payment.order_cancelled') }}</p>
                  <p v-else-if="orderDetail.status === 3">{{ $t('payment.payment_successful_desc') }}</p>
                  <p v-else-if="orderDetail.status === 4">{{ $t('payment.payment_successful_desc') }}</p>
                  <p v-else-if="orderDetail.status !== 0">{{ $t('payment.unknown_status_desc') }}</p>
                </div>
              </div>
            </div>
            
            <div class="skeleton-card" v-else>
              <div class="skeleton-text"></div>
            </div>
          </div>
          
          <!-- 免费订单提示 -->
          <div class="section-wrapper free-order" v-if="!loading.order && orderDetail.total_amount === 0 && orderDetail.status === 0">
            <div class="section-title">
              <span>{{ $t('payment.free_order') }}</span>
            </div>
            
            <div class="free-notice">
              <IconAlertCircle :size="48" class="notice-icon success" />
              <div class="notice-text">
                <h3>{{ $t('payment.free_order_title') }}</h3>
                <p>{{ $t('payment.free_order_desc') }}</p>
              </div>
            </div>
          </div>
          
          <!-- 支付方式 - 仅当订单状态为待支付(0)时显示 -->
          <div class="section-wrapper" v-if="!loading.order && orderDetail.status === 0 && orderDetail.total_amount > 0">
            <div class="section-title">
              <span>{{ $t('payment.payment_method') }}</span>
            </div>
            
            <div class="payment-methods" v-if="!loading.methods">
              <div 
                class="payment-method-item" 
                v-for="method in paymentMethods" 
                :key="method.id" 
                :class="{ 'active': selectedMethod === method.id }"
                @click="selectMethod(method.id)"
              >
                <div class="method-icon">
                  <IconCreditCard v-if="!method.icon" />
                  <img v-else :src="method.icon" :alt="method.name" />
                </div>
                <div class="method-details">
                  <div class="method-name">{{ method.name }}</div>
                  <div class="method-fee" v-if="method.handling_fee_percent || method.handling_fee_fixed">
                    {{ formatFee(method) }}
                  </div>
                </div>
                <div class="method-check">
                  <IconCircleCheck v-if="selectedMethod === method.id" />
                  <IconCircle v-else />
                </div>
              </div>
            </div>
            
            <!-- 支付方式骨架屏 -->
            <div class="skeleton-card" v-else>
              <div class="skeleton-payment-method" v-for="i in 2" :key="'method-'+i"></div>
            </div>
          </div>
          
          <!-- 按钮区域 -->
          <div class="action-buttons">
            <!-- 从订单列表进入且订单已完成 - 显示返回上一页按钮 -->
            <div class="btn-group pay-row" v-if="fromOrderList && (paymentSuccessful || orderDetail.status !== 0)">
              <button 
                class="btn-back main-action full-width" 
                @click="goBack"
              >
                <IconArrowLeft :size="18" />
                <span>{{ $t('payment.return_to_previous') }}</span>
              </button>
            </div>
            
            <!-- 非订单列表进入 - 支付成功后的按钮，显示前往仪表盘 -->
            <div class="btn-group pay-row" v-if="(paymentSuccessful || orderDetail.status > 0) && !fromOrderList">
              <button 
                class="btn-pay main-action full-width" 
                @click="goToDashboard"
              >
                <IconArrowRight :size="18" />
                <span v-if="orderDetail.period === 'deposit'">{{ $t('payment.continue_to_wallet') }}</span>
                <span v-else>{{ $t('payment.continue_to_dashboard') }}</span>
              </button>
            </div>
            
            <!-- 待支付订单相关按钮 -->
            <template v-if="!loading.order && orderDetail.status === 0 && !paymentSuccessful">
              <!-- 支付/激活按钮单独占一行 -->
              <div class="btn-group pay-row" v-if="orderDetail.total_amount > 0">
                <button 
                  class="btn-pay main-action full-width" 
                  @click="processPayment"
                  :disabled="(orderDetail.total_amount > 0 && !selectedMethod) || loading.paying || loading.checking"
                >
                  <IconCreditCard v-if="!loading.paying" :size="18" />
                  <div v-else class="loader"></div>
                  <span>{{ $t('payment.pay_now') }}</span>
                </button>
              </div>
              
              <!-- 免费订单场景 - 修改为取消和激活按钮在同一行 -->
              <div class="btn-group action-row" v-if="orderDetail.total_amount === 0">
                <!-- 左侧取消按钮 -->
                <button 
                  class="btn-back secondary-action" 
                  @click="cancelCurrentOrder"
                  :disabled="loading.cancelling"
                >
                  <IconX v-if="!loading.cancelling" :size="18" />
                  <div v-else class="loader"></div>
                  <span>{{ $t('payment.cancel_order') }}</span>
                </button>
                
                <!-- 右侧激活按钮 -->
                <button 
                  class="btn-pay main-action" 
                  @click="checkPayment"
                  :disabled="loading.checking"
                >
                  <IconCreditCard v-if="!loading.checking" :size="18" />
                  <div v-else class="loader"></div>
                  <span>{{ $t('payment.activate') }}</span>
                </button>
              </div>

              <!-- 检测状态和取消订单按钮一行，取消在左，检测在右 -->
              <div class="btn-group action-row" v-if="orderDetail.total_amount > 0">
                <button 
                  class="btn-back secondary-action" 
                  @click="cancelCurrentOrder"
                  :disabled="loading.cancelling"
                >
                  <IconX v-if="!loading.cancelling" :size="18" />
                  <div v-else class="loader"></div>
                  <span>{{ $t('payment.cancel_order') }}</span>
                </button>
                
                <button 
                  class="btn-check secondary-action" 
                  @click="checkPaymentStatus"
                  :disabled="(orderDetail.total_amount > 0 && !selectedMethod) || loading.checking || loading.paying"
                >
                  <IconRefresh v-if="!loading.checking" :size="18" />
                  <div v-else class="loader"></div>
                  <span>{{ $t('payment.check_payment') }}</span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 支付成功动画 -->
    <transition name="fade">
      <div class="payment-success-overlay" v-if="showSuccessAnimation">
        <div class="success-animation">
          <div class="check-container">
            <div class="check-background">
              <IconCheck :size="100" class="check-icon" />
            </div>
          </div>
          <h2>{{ $t('payment.payment_successful') }}</h2>
          <p>{{ $t('payment.payment_successful_desc') }}</p>
        </div>
        <div v-if="showConfettiAnimation" class="confetti-container">
          <ConfettiExplosion
            :particleCount="150"
            :force="0.4"
            :stageWidth="window.innerWidth"
            :stageHeight="window.innerHeight"
            :colors="['#ffcc00', '#ff8800', '#ff3333', '#26A65B', '#42A5F5', '#9C27B0']"
          />
        </div>
      </div>
    </transition>
    
    <!-- 取消订单确认弹窗 -->
    <transition name="modal-fade">
      <div class="cancel-modal" v-if="showCancelConfirm">
        <div class="cancel-modal-overlay" @click="closeModal"></div>
        <div class="cancel-modal-container">
          <div class="cancel-modal-content">
            <div class="cancel-modal-icon">
              <IconAlertTriangle :size="28" />
            </div>
            
            <div class="cancel-modal-header">
              <h3>{{ $t('payment.confirm_cancel_title') }}</h3>
              <p>{{ $t('payment.confirm_cancel_desc') }}</p>
            </div>
            
            <div class="cancel-modal-actions">
              <button class="cancel-btn" @click="closeModal">
                {{ $t('common.cancel') }}
              </button>
              <button class="confirm-btn" @click="confirmCancel">
                {{ $t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- 支付二维码弹窗 -->
    <transition name="modal">
      <div class="modal-wrapper" v-if="showPaymentModal">
        <div class="modal-backdrop" @click="closePaymentModal"></div>
        <div class="modal-container">
          <div class="modal-card">
            <button class="close-button" @click="closePaymentModal">×</button>
            <div class="modal-header">
              <div class="icon-wrapper payment">
                <IconCreditCard :size="32" />
              </div>
              <h3>{{ selectedMethod ? getSelectedMethodName() : $t('payment.payment_method') }}</h3>
              
              <!-- 添加Safari浏览器特定提示 -->
              <p v-if="detectBrowser() === 'Safari' && PAYMENT_CONFIG.useSafariPaymentModal && paymentLink">
                {{ $t('payment.safari_payment_notice') }}
              </p>
              <p v-else>
                {{ $t('payment.scan_qrcode') }}
              </p>
              
              <div class="qrcode-container" v-if="paymentQRCode">
                <QrcodeVue 
                  :value="paymentQRCode" 
                  :size="PAYMENT_CONFIG.qrcodeSize" 
                  :background="PAYMENT_CONFIG.qrcodeBackground"
                  :foreground="PAYMENT_CONFIG.qrcodeColor"
                  level="H"
                  render-as="svg"
                />
              </div>
              
              <div class="payment-link" v-if="paymentLink">
                <button class="btn-link" @click="openPaymentLink">
                  <IconExternalLink :size="18" />
                  <span v-if="detectBrowser() === 'Safari' && PAYMENT_CONFIG.useSafariPaymentModal">
                    {{ $t('payment.safari_payment_button') }}
                  </span>
                  <span v-else>
                    {{ $t('payment.open_in_new_tab') }}
                  </span>
                </button>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="closePaymentModal">
                <IconX :size="18" />
                <span>{{ $t('common.cancel') }}</span>
              </button>
              <button class="btn-primary" @click="checkPayment">
                <IconRefresh :size="18" />
                <span>{{ $t('payment.check_payment') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed, onBeforeUnmount, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { getOrderDetail, getPaymentMethods, checkOrderStatus, cancelOrder, checkoutOrder } from '@/api/shop';
import { PAYMENT_CONFIG } from '@/utils/baseConfig';
import QrcodeVue from 'qrcode.vue';
import ConfettiExplosion from 'vue-confetti-explosion';
import {
  IconCheck,
  IconX,
  IconCreditCard,
  IconCircle,
  IconCircleCheck,
  IconAlertCircle,
  IconArrowRight,
  IconAlertTriangle,
  IconRefresh,
  IconExternalLink,
  IconArrowLeft,
  IconClock,
  IconLoader2,
  IconHelp
} from '@tabler/icons-vue';

// 引入浏览器检测函数
import { detectBrowser } from '@/utils/baseConfig';

export default {
  name: 'PaymentView',
  components: {
    IconCheck,
    IconX,
    IconCreditCard,
    IconCircle,
    IconCircleCheck,
    IconAlertCircle,
    IconArrowRight,
    IconAlertTriangle,
    IconRefresh,
    IconExternalLink,
    IconArrowLeft,
    QrcodeVue,
    ConfettiExplosion,
    IconClock,
    IconLoader2,
    IconHelp
  },
  setup() {
    const { t } = useI18n();
    const { showToast } = useToast();
    const route = useRoute();
    const router = useRouter();
    
    // 记录是否从OrderList进入
    const fromOrderList = ref(false);
    
    // 加载状态
    const loading = reactive({
      order: true,
      methods: true,
      checking: false,
      cancelling: false,
      paying: false
    });
    
    // 订单详情
    const orderDetail = ref({});
    const paymentMethods = ref([]);
    const selectedMethod = ref(null);
    const paymentCheckTimer = ref(null);
    const paymentSuccessful = ref(false);
    const showSuccessAnimation = ref(false);
    const showConfettiAnimation = ref(false);
    
    // 添加控制弹窗显示的响应式变量
    const showCancelConfirm = ref(false);
    const showPaymentModal = ref(false);
    const paymentQRCode = ref(null);
    const paymentLink = ref(null);
    
    // 计算手续费
    const handleFeeAmount = computed(() => {
      if (!selectedMethod.value || !orderDetail.value.total_amount) {
        return 0;
      }
      
      const method = paymentMethods.value.find(m => m.id === selectedMethod.value);
      if (!method) {
        return 0;
      }
      
      let fee = 0;
      
      // 计算百分比手续费
      if (method.handling_fee_percent) {
        fee += (orderDetail.value.total_amount * method.handling_fee_percent / 100);
      }
      
      // 添加固定手续费
      if (method.handling_fee_fixed) {
        fee += method.handling_fee_fixed;
      }
      
      return Math.round(fee); // 四舍五入到整数（转为分）
    });
    
    // 计算含手续费的总金额
    const totalWithFee = computed(() => {
      if (!orderDetail.value.total_amount) {
        return 0;
      }
      return orderDetail.value.total_amount + handleFeeAmount.value;
    });
    
    // 获取订单详情
    const fetchOrderDetail = async () => {
      loading.order = true;
      try {
        // 处理URL中可能存在多个trade_no参数的情况
        let tradeNo = null;
        
        // 获取URL中所有的查询参数
        const queryParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        
        // 优先使用trade_no参数
        if (queryParams.has('trade_no')) {
          // 获取第一个trade_no值
          tradeNo = queryParams.get('trade_no');
        }
        
        // 如果没有trade_no，尝试使用out_trade_no
        if (!tradeNo && queryParams.has('out_trade_no')) {
          tradeNo = queryParams.get('out_trade_no');
        }
        
        // 如果还是没有，回退到route.query
        if (!tradeNo) {
          tradeNo = route.query.trade_no || route.query.out_trade_no;
        }
        
        if (!tradeNo) {
          showToast(t('payment.no_order_selected'), 'error');
          router.push('/shop');
          return;
        }
        
        const response = await getOrderDetail(tradeNo);
        if (response.data) {
          orderDetail.value = response.data;
          
          // 如果订单状态不是待支付(0)，则不启动支付检查流程
          // 如果是免费订单且状态是待支付(0)，自动触发确认逻辑
          if (orderDetail.value.status === 0 && orderDetail.value.total_amount === 0) {
            startPaymentCheck();
          }
        } else {
          showToast(t('payment.order_not_found'), 'error');
          router.push('/shop');
        }
      } catch (error) {
        console.error('获取订单详情失败:', error);
        showToast(t('payment.failed_to_fetch_order'), 'error');
        router.push('/shop');
      } finally {
        loading.order = false;
      }
    };
    
    // 获取支付方式
    const fetchPaymentMethods = async () => {
      loading.methods = true;
      try {
        const response = await getPaymentMethods();
        if (response.data) {
          paymentMethods.value = response.data;
          
          // 根据配置决定是否自动选择第一个支付方式
          if (paymentMethods.value.length === 1 || PAYMENT_CONFIG.autoSelectFirstMethod) {
            // 自动选择第一个支付方式
            if (paymentMethods.value.length > 0) {
              selectedMethod.value = paymentMethods.value[0].id;
            }
          }
        }
      } catch (error) {
        console.error('获取支付方式失败:', error);
        showToast(t('payment.failed_to_fetch_methods'), 'error');
      } finally {
        loading.methods = false;
      }
    };
    
    // 选择支付方式
    const selectMethod = (methodId) => {
      selectedMethod.value = methodId;
    };
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return '-';
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    };
    
    // 格式化金额
    const formatAmount = (amount) => {
      if (amount === null || amount === undefined) return '-';
      return `¥${(amount / 100).toFixed(2)}`;
    };
    
    // 格式化周期
    const formatPeriod = (period) => {
      // 特殊周期类型处理，使用payment.period_types中的翻译
      if (period === 'reset_price' || period === 'deposit') {
        return t(`payment.period_types.${period}`);
      }

      // 常规周期类型处理
      const periodMap = {
        month_price: t('shop.plan.price_options.month'),
        quarter_price: t('shop.plan.price_options.quarter'),
        half_year_price: t('shop.plan.price_options.half_year'),
        year_price: t('shop.plan.price_options.year'),
        two_year_price: t('shop.plan.price_options.two_year'),
        three_year_price: t('shop.plan.price_options.three_year'),
        onetime_price: t('shop.plan.price_options.onetime')
      };
      return periodMap[period] || period;
    };
    
    // 格式化流量
    const formatTraffic = (gb) => {
      if (!gb) return '-';
      if (gb >= 1024) {
        return `${(gb / 1024).toFixed(1)} TB`;
      }
      return `${gb} GB`;
    };
    
    // 格式化手续费
    const formatFee = (method) => {
      let feeText = '';
      
      if (method.handling_fee_percent) {
        feeText += `${method.handling_fee_percent}%`;
      }
      
      if (method.handling_fee_fixed) {
        const fixedFee = (method.handling_fee_fixed / 100).toFixed(2);
        feeText += feeText ? ` + ¥${fixedFee}` : `¥${fixedFee}`;
      }
      
      return feeText ? `${t('payment.fee')}: ${feeText}` : '';
    };
    
    // 获取套餐原始价格
    const getPlanPrice = () => {
      if (!orderDetail.value || !orderDetail.value.plan || !orderDetail.value.period) {
        return 0;
      }
      return orderDetail.value.plan[orderDetail.value.period] || 0;
    };
    
    // 检查支付状态
    const checkPayment = async () => {
      // 检查是否选择了支付方式
      if (orderDetail.value.total_amount > 0 && !selectedMethod.value) {
        showToast(t('payment.select_method_first'), 'warning');
        return;
      }
      
      loading.checking = true;
      
      try {
        // 如果是免费订单，也需要调用结算接口，但先选择一个可用的支付方式
        if (orderDetail.value.total_amount === 0) {
          // 如果有支付方式，选择第一个
          if (paymentMethods.value && paymentMethods.value.length > 0) {
            selectedMethod.value = paymentMethods.value[0].id;
          }
        }
        
        // 调用结算接口
        await checkoutOrder(orderDetail.value.trade_no, selectedMethod.value);
        
        // 显示激活中状态
        showToast(t('payment.payment_processing'), 'info');
        
        // 开始检查支付状态
        startPaymentCheck();
      } catch (error) {
        console.error('结算订单失败:', error);
        showToast(t('payment.check_failed'), 'error');
        loading.checking = false;
      }
    };
    
    // 开始定时检查支付状态
    const startPaymentCheck = async () => {
      try {
        // 如果已经成功支付，不要再次检查
        if (paymentSuccessful.value) {
          return;
        }
        
        // 执行一次立即检查
        await performPaymentCheck();
        
        // 如果是免费订单且尚未成功，进行一次额外检查，但不要再次提示
        if (orderDetail.value.total_amount === 0 && !paymentSuccessful.value) {
          setTimeout(async () => {
            // 创建一个临时的空函数，而不是修改常量
            const suppressToast = true;
            await performPaymentCheck(suppressToast);
          }, 1000);
        }
        // 如果不是免费订单并且未成功支付，则开始定时检查
        else if (orderDetail.value.total_amount > 0 && !paymentSuccessful.value) {
          // 清除可能存在的旧定时器
          if (paymentCheckTimer.value) {
            clearInterval(paymentCheckTimer.value);
          }
          
          // 根据配置决定是否自动检测以及检测次数
          if (PAYMENT_CONFIG.autoCheckPayment) {
            let checkCount = 0;
            
            paymentCheckTimer.value = setInterval(() => {
              checkCount++;
              
              // 执行检查
              performPaymentCheck();
              
              // 如果达到最大检测次数且配置了最大次数限制，停止检测
              if (PAYMENT_CONFIG.autoCheckMaxTimes > 0 && checkCount >= PAYMENT_CONFIG.autoCheckMaxTimes) {
                clearInterval(paymentCheckTimer.value);
                loading.checking = false;
                
                if (!paymentSuccessful.value) {
                  showToast(t('payment.check_timeout'), 'info');
                }
              }
            }, PAYMENT_CONFIG.autoCheckInterval);
          } else {
            // 仅检查几次（向后兼容原有行为）
            let checkCount = 0;
            paymentCheckTimer.value = setInterval(() => {
              checkCount++;
              
              // 执行检查
              performPaymentCheck();
              
              // 如果已经检查了2次（总共10秒），就停止检查
              if (checkCount >= 2) {
                clearInterval(paymentCheckTimer.value);
                loading.checking = false;
                
                if (!paymentSuccessful.value) {
                  showToast(t('payment.check_timeout'), 'info');
                }
              }
            }, 5000);
          }
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
        showToast(t('payment.check_failed'), 'error');
        loading.checking = false;
      }
    };
    
    // 执行支付状态检查
    const performPaymentCheck = async (suppressToast = false) => {
      try {
        const response = await checkOrderStatus(orderDetail.value.trade_no);
        
        // 如果状态是开通中(1)，1秒后自动设置为已完成(3)
        if (response.data === 1) {
          // 更新订单状态为开通中
          orderDetail.value.status = response.data;
          
          // 1秒后自动转为已完成状态
          setTimeout(() => {
            // 添加过渡动画效果的类
            const statusElement = document.querySelector('.order-status-notice');
            if (statusElement) {
              statusElement.classList.add('status-transition');
            }
            
            // 更新状态为已完成
            orderDetail.value.status = 3;
            
            // 处理支付成功逻辑
            handlePaymentSuccess(!suppressToast);
          }, 1000);
        }
        // 如果状态不是0(待支付)或2(已取消)，表示支付成功
        else if (response.data !== 0 && response.data !== 2) {
          // 订单已完成，更新本地状态
          orderDetail.value.status = response.data;
          
          // 处理支付成功逻辑
          handlePaymentSuccess(!suppressToast);
        } else if (response.data === 2) {
          // 订单已取消
          if (paymentCheckTimer.value) {
            clearInterval(paymentCheckTimer.value);
            paymentCheckTimer.value = null;
          }
          
          if (!suppressToast) {
            showToast(t('payment.order_cancelled'), 'warning');
          }
          loading.checking = false;
          loading.paying = false;
          
          // 更新订单状态
          orderDetail.value.status = response.data;
          
          // 关闭支付弹窗
          closePaymentModal();
        }
        
        // 如果是免费订单，只检查一次后就停止加载状态
        if (orderDetail.value.total_amount === 0) {
          loading.checking = false;
          loading.paying = false;
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
        // 如果是免费订单，出错时也停止加载状态
        if (orderDetail.value.total_amount === 0) {
          loading.checking = false;
          loading.paying = false;
        }
      }
    };
    
    // 支付成功的处理逻辑，提取为单独函数
    const handlePaymentSuccess = (showNotification = true) => {
      // 如果已经设置过支付成功，不要重复处理
      if (paymentSuccessful.value) {
        return;
      }
      
      // 支付成功
      if (paymentCheckTimer.value) {
        clearInterval(paymentCheckTimer.value);
        paymentCheckTimer.value = null;
      }
      
      // 设置支付成功状态
      paymentSuccessful.value = true;
      // console.log('设置paymentSuccessful=true, 当前fromOrderList=', fromOrderList.value);
      loading.checking = false;
      loading.paying = false;
      
      // 关闭支付弹窗
      closePaymentModal();
      
      // 只有在不是从订单列表页面进入时才显示成功动画
      if (!fromOrderList.value) {
        // console.log('显示支付成功动画和前往仪表盘按钮');
        // 显示支付成功动画
        showSuccessAnimation.value = true;
        
        // 强制DOM更新
        nextTick(() => {
          // console.log('强制DOM更新后，检查动画状态:', showSuccessAnimation.value, '按钮状态:', paymentSuccessful.value);
          
          // 稍后显示礼花效果
          setTimeout(() => {
            showConfettiAnimation.value = true;
          }, 300);
          
          if (showNotification) {
            showToast(t('payment.pay_success'), 'success');
          }
          
          // 5秒后关闭动画并淡出
          setTimeout(() => {
            showConfettiAnimation.value = false;
            
            // 0.5秒后关闭整个成功动画
            setTimeout(() => {
              showSuccessAnimation.value = false;
            }, 500);
          }, 4500);
        });
      } else {
        // console.log('从订单列表页面进入，跳过支付成功动画');
      }
    };
    
    // 修改取消订单方法
    const cancelCurrentOrder = () => {
      if (loading.cancelling) return;
      showCancelConfirm.value = true;
    };
    
    // 关闭弹窗方法
    const closeModal = () => {
      showCancelConfirm.value = false;
    };
    
    // 关闭支付弹窗
    const closePaymentModal = () => {
      showPaymentModal.value = false;
      paymentQRCode.value = null;
      paymentLink.value = null;
    };
    
    // 获取选中的支付方式名称
    const getSelectedMethodName = () => {
      if (!selectedMethod.value) return '';
      const method = paymentMethods.value.find(m => m.id === selectedMethod.value);
      return method ? method.name : '';
    };
    
    // 处理支付操作
    const processPayment = async () => {
      // 检查是否选择了支付方式
      if (!selectedMethod.value) {
        showToast(t('payment.select_method_first'), 'warning');
        return;
      }
      
      loading.paying = true;
      
      try {
        // 调用结算接口
        const response = await checkoutOrder(orderDetail.value.trade_no, selectedMethod.value);
        
        if (response.data) {
          if (response.type === 0) {
            // 显示二维码
            paymentQRCode.value = response.data;
            paymentLink.value = null;
            // 显示支付弹窗
            showPaymentModal.value = true;
          } else if (response.type === 1) {
            // 记录URL链接
            paymentLink.value = response.data;
            paymentQRCode.value = null;
            
            // 检测是否为Safari浏览器以及是否启用Safari浏览器模态窗口选项
            const isSafari = detectBrowser() === 'Safari';
            const useSafariModal = PAYMENT_CONFIG.useSafariPaymentModal;
            
            // 如果是Safari浏览器且启用了Safari模态窗口选项
            if (isSafari && useSafariModal) {
              // 显示支付弹窗让用户手动点击打开
              showPaymentModal.value = true;
            } else {
              // 使用更兼容的方法打开支付链接
              if (PAYMENT_CONFIG.openPaymentInNewTab) {
                // 创建一个临时链接并模拟点击以打开新窗口
                setTimeout(() => {
                  const tempLink = document.createElement('a');
                  tempLink.href = response.data;
                  tempLink.target = '_blank';
                  tempLink.rel = 'noopener noreferrer';
                  document.body.appendChild(tempLink);
                  tempLink.click();
                  document.body.removeChild(tempLink);
                  
                  // 显示支付弹窗以便用户可以检查支付状态
                  showPaymentModal.value = true;
                }, 100);
              } else {
                // 在iOS和其他浏览器上使用更可靠的跳转方法
                setTimeout(() => {
                  const tempLink = document.createElement('a');
                  tempLink.href = response.data;
                  tempLink.rel = 'noopener noreferrer';
                  document.body.appendChild(tempLink);
                  tempLink.click();
                  document.body.removeChild(tempLink);
                }, 100);
              }
            }
          }
          
          // 开始检查支付状态
          startPaymentCheck();
        }
      } catch (error) {
        console.error('发起支付失败:', error);
        showToast(t('payment.check_failed'), 'error');
      } finally {
        loading.paying = false;
      }
    };
    
    // 打开支付链接
    const openPaymentLink = () => {
      if (paymentLink.value) {
        // 使用更兼容的方法打开支付链接
        try {
          const isSafari = detectBrowser() === 'Safari';
          
          if (PAYMENT_CONFIG.openPaymentInNewTab || (isSafari && PAYMENT_CONFIG.useSafariPaymentModal)) {
            // 创建一个临时链接并模拟点击以打开新窗口
            const tempLink = document.createElement('a');
            tempLink.href = paymentLink.value;
            tempLink.target = '_blank';
            tempLink.rel = 'noopener noreferrer';
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
          } else {
            // 在当前页面打开
            const tempLink = document.createElement('a');
            tempLink.href = paymentLink.value;
            tempLink.rel = 'noopener noreferrer';
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
          }
        } catch (e) {
          console.error('支付链接打开失败:', e);
          // 降级方案，尝试使用传统方法
          if (PAYMENT_CONFIG.openPaymentInNewTab) {
            window.open(paymentLink.value, '_blank');
          } else {
            window.location.href = paymentLink.value;
          }
        }
      }
    };
    
    // 确认取消订单
    const confirmCancel = async () => {
      loading.cancelling = true;
      showCancelConfirm.value = false;
      
      try {
        await cancelOrder(orderDetail.value.trade_no);
        showToast(t('payment.cancel_success'), 'success');
        
        // 清除定时器
        if (paymentCheckTimer.value) {
          clearInterval(paymentCheckTimer.value);
        }
        
        // 返回商店
        router.push('/shop');
      } catch (error) {
        console.error('取消订单失败:', error);
        showToast(t('payment.cancel_failed'), 'error');
      } finally {
        loading.cancelling = false;
      }
    };
    
    // 前往仪表盘或充值页面
    const goToDashboard = () => {
      // 如果是充值订单，返回充值页面
      if(orderDetail.value.period === 'deposit') {
        router.push('/wallet/deposit');
      } else {
        // 否则返回仪表盘
        router.push('/dashboard');
      }
    };
    
    // 检查支付状态
    const checkPaymentStatus = async () => {
      loading.checking = true;
      try {
        const response = await checkOrderStatus(orderDetail.value.trade_no);
        
        if (response.data === 0) {
          showToast(t('payment.payment_pending'), 'info');
        } else if (response.data === 2) {
          // 订单已取消
          showToast(t('payment.order_cancelled'), 'warning');
          
          // 取消订单时清除定时器
          if (paymentCheckTimer.value) {
            clearInterval(paymentCheckTimer.value);
            paymentCheckTimer.value = null;
          }
          
          // 更新订单状态
          orderDetail.value.status = response.data;
          
        } else {
          // 支付成功
          showToast(t('payment.payment_successful'), 'success');
          
          // 更新订单状态
          orderDetail.value.status = response.data;
          
          // 更新支付成功状态
          paymentSuccessful.value = true;
          
          // 支付成功时清除定时器
          if (paymentCheckTimer.value) {
            clearInterval(paymentCheckTimer.value);
            paymentCheckTimer.value = null;
          }
          
          // 关闭支付弹窗
          closePaymentModal();
          
          // 显示支付成功动画
          showSuccessAnimation.value = true;
          
          // 稍后显示礼花效果
          setTimeout(() => {
            showConfettiAnimation.value = true;
          }, 300);
          
          // 5秒后关闭动画并淡出
          setTimeout(() => {
            showConfettiAnimation.value = false;
            
            // 0.5秒后关闭整个成功动画
            setTimeout(() => {
              showSuccessAnimation.value = false;
            }, 500);
          }, 4500);
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
        showToast(t('payment.check_failed'), 'error');
      } finally {
        loading.checking = false;
        loading.paying = false;
      }
    };
    
    // 获取订单状态文本
    const getStatusText = (status) => {
      const statusMap = {
        0: t('payment.status.pending'),
        1: t('payment.status.processing'),
        2: t('payment.status.cancelled'),
        3: t('payment.status.completed'),
        4: t('payment.status.discounted')
      };
      return statusMap[status] || t('payment.status.unknown');
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
    
    // 返回上一页
    const goBack = () => {
      router.go(-1);
    };
    
    // 组件挂载时获取数据
    onMounted(() => {
      fetchOrderDetail();
      fetchPaymentMethods();
      
      // 检查是否从订单列表页面跳转过来
      if (route.query.from === 'orders') {
        fromOrderList.value = true;
      } 
      // 从referrer判断来源
      else if (document.referrer && document.referrer.includes('/orders')) {
        fromOrderList.value = true;
      } 
      // 其他情况都显示动画和按钮
      else {
        fromOrderList.value = false;
      }
      
      // 订单详情加载完成后，检查订单状态
      watch(() => orderDetail.value.status, (newStatus) => {
        // 如果订单状态为已完成(3或4)且不是从订单列表进入，显示支付成功动画
        if ((newStatus === 3 || newStatus === 4) && !paymentSuccessful.value) {
          paymentSuccessful.value = true;
          
          // 如果不是从订单列表页面进入，展示支付成功动画
          if (!fromOrderList.value) {
            showSuccessAnimation.value = true;
            nextTick(() => {
              setTimeout(() => {
                showConfettiAnimation.value = true;
              }, 300);
              
              // 5秒后关闭动画并淡出
              setTimeout(() => {
                showConfettiAnimation.value = false;
                setTimeout(() => {
                  showSuccessAnimation.value = false;
                }, 500);
              }, 4500);
            });
          }
        }
      }, { immediate: false });
    });
    
    // 组件卸载前清理定时器
    onBeforeUnmount(() => {
      if (paymentCheckTimer.value) {
        clearInterval(paymentCheckTimer.value);
      }
    });
    
    return {
      loading,
      orderDetail,
      paymentMethods,
      selectedMethod,
      paymentSuccessful,
      showSuccessAnimation,
      showConfettiAnimation,
      fromOrderList,
      formatDate,
      formatAmount,
      formatPeriod,
      formatTraffic,
      formatFee,
      selectMethod,
      checkPayment,
      cancelCurrentOrder,
      goToDashboard,
      getPlanPrice,
      showCancelConfirm,
      confirmCancel,
      closeModal,
      showPaymentModal,
      paymentQRCode,
      paymentLink,
      PAYMENT_CONFIG,
      getSelectedMethodName,
      processPayment,
      openPaymentLink,
      closePaymentModal,
      handleFeeAmount,
      totalWithFee,
      window: window,
      checkPaymentStatus,
      detectBrowser,
      getStatusText,
      getStatusClass,
      goBack
    };
  }
};
</script>

<style lang="scss" scoped>
.payment-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  position: relative;
  
  .payment-inner {
    width: 100%;
    max-width: 1200px;
  }
  
  .title-card {
    margin-top: 20px;
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
        color: var(--secondary-text-color);
        margin: 0;
      }
    }
  }
  
  .content-wrapper {
    display: flex;
    gap: 25px;
    
    @media (max-width: 768px) {
      flex-direction: column;
    }
    
    .left-column, .right-column {
      flex: 1;
      min-width: 0;
    }
  }
  
  .section-wrapper {
    background-color: var(--card-bg-color);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
    
    &:last-child {
      margin-bottom: 40px;
    }
    
    &:hover {
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      border-color: rgba(var(--theme-color-rgb), 0.3);
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-color);
      display: flex;
      align-items: center;
      
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background-color: var(--border-color);
        margin-left: 12px;
      }
    }
  }
  
  /* 产品信息样式 */
  .product-info, .order-info {
    .info-row {
      display: flex;
      margin-bottom: 12px;
      padding: 10px;
      border-radius: 8px;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.05);
      }
      
      &.highlight-row {
        background-color: rgba(var(--theme-color-rgb), 0.08);
        
        .amount {
          font-size: 18px;
          font-weight: 600;
          color: var(--theme-color);
        }
      }
      
      &.discount-row {
        .discount {
          color: #f44336;
        }
      }
      
      &.final-row {
        border-top: 1px dashed var(--border-color);
        padding-top: 15px;
        
        .final {
          font-size: 20px;
          font-weight: 700;
          color: var(--theme-color);
        }
      }
      
      .info-label {
        width: 120px;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      
      .info-value {
        flex: 1;
        color: var(--text-color);
        font-weight: 500;
        font-size: 14px;
      }
    }
  }
  
  /* 支付方式样式 */
  .payment-methods {
    .payment-method-item {
      display: flex;
      align-items: center;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid var(--border-color);
      
      &:hover {
        border-color: rgba(var(--theme-color-rgb), 0.5);
        background-color: rgba(var(--theme-color-rgb), 0.05);
        transform: translateY(-2px);
      }
      
      &.active {
        border-color: var(--theme-color);
        background-color: rgba(var(--theme-color-rgb), 0.1);
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(var(--theme-color-rgb), 0.15);
      }
      
      .method-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        color: var(--theme-color);
        
        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      }
      
      .method-details {
        flex: 1;
        min-width: 0;
        
        .method-name {
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-color);
        }
        
        .method-fee {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
      }
      
      .method-check {
        color: var(--theme-color);
      }
    }
  }
  
  /* 免费订单提示 */
  .free-notice {
    display: flex;
    align-items: center;
    padding: 20px;
    background-color: rgba(76, 175, 80, 0.1);
    border-radius: 10px;
    border: 1px solid rgba(76, 175, 80, 0.2);
    
    .notice-icon {
      margin-right: 20px;
      color: #4caf50;
      
      &.success {
        color: #4caf50;
      }
    }
    
    .notice-text {
      flex: 1;
      
      h3 {
        margin: 0 0 8px;
        color: #4caf50;
        font-size: 16px;
      }
      
      p {
        margin: 0;
        color: var(--text-color);
      }
    }
  }
  
  /* 按钮区域 */
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-top: 30px;
    margin-bottom: 20px;
    
    .btn-group {
      display: flex;
      gap: 15px;
      width: 100%;
      
      @media (max-width: 480px) {
        flex-direction: column;
        gap: 10px;
        
        /* 确保在移动设备上按钮有足够的高度 */
        .btn-back, .btn-pay, .btn-check, .btn-continue {
          width: 100%;
          height: 48px;
          min-height: 48px;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
      
      .main-action {
        flex: 3;
      }
      
      .secondary-action {
        flex: 1;
        min-width: 130px;
      }
      
      &.pay-row {
        margin-bottom: 10px;
      }
      
      &.action-row {
        justify-content: space-between;
        
        .btn-back, .btn-check {
          flex: 1;
        }
        
        /* 免费订单场景按钮样式调整 */
        .btn-pay {
          flex: 2;
        }
      }
    }
    
    .btn-back, .btn-pay, .btn-check, .btn-continue {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      padding: 0 24px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      
      @media (max-width: 480px) {
        width: 100%;
        height: 48px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    .full-width {
      width: 100%;
    }
    
    .btn-back {
      background-color: transparent;
      color: var(--text-color);
      flex: 1;
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
      
      &:hover:not(:disabled) {
        background-color: var(--hover-color);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      &:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(0, 0, 0, 0.05);
      }
      
      &.full-width {
        margin-top: 5px;
        max-width: 100%;
        justify-content: center;
      }
    }
    
    .btn-pay, .btn-continue {
      background-color: var(--theme-color);
      color: white;
      flex: 2;
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.25);
      
      &:hover:not(:disabled) {
        background-color: var(--primary-color-hover);
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.35);
      }
    }
    
    .btn-check {
      background-color: var(--hover-color);
      color: var(--text-color);
      flex: 1;
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
      
      &:hover:not(:disabled) {
        background-color: var(--card-bg-color);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
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
  }
  
  /* 骨架屏样式 */
  .skeleton-card {
    width: 100%;
    position: relative;
    overflow: hidden;
    
    .skeleton-text, .skeleton-payment-method {
      height: 20px;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      margin-bottom: 15px;
      position: relative;
      overflow: hidden;
      
      &:nth-child(1) { width: 100%; }
      &:nth-child(2) { width: 85%; }
      &:nth-child(3) { width: 75%; }
      &:nth-child(4) { width: 90%; }
      &:nth-child(5) { width: 80%; }
      
      &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: linear-gradient(90deg, 
          rgba(255, 255, 255, 0) 0%, 
          rgba(255, 255, 255, 0.15) 50%, 
          rgba(255, 255, 255, 0) 100%);
        transform: translateX(-100%);
        animation: shimmer 2s infinite;
        will-change: transform;
      }
    }
    
    .skeleton-payment-method {
      height: 70px;
      margin-bottom: 20px;
    }
  }
  
  /* 支付成功动画 */
  .payment-success-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    
    .success-animation {
      text-align: center;
      color: white;
      padding: 30px;
      max-width: 500px;
      z-index: 1001;
      
      .check-container {
        margin-bottom: 24px;
        
        .check-background {
          background-color: var(--theme-color);
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          animation: zoomIn 0.5s ease, pulse 2s infinite ease-in-out;
          box-shadow: 0 0 30px rgba(var(--theme-color-rgb), 0.7);
          
          .check-icon {
            color: white;
            animation: bounceIn 0.8s ease 0.2s both;
          }
        }
      }
      
      h2 {
        font-size: 28px;
        margin-bottom: 16px;
        animation: slideUp 0.5s ease 0.4s both;
      }
      
      p {
        font-size: 16px;
        opacity: 0.8;
        animation: slideUp 0.5s ease 0.6s both;
      }
    }
    
    /* 礼花容器 */
    .confetti-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      pointer-events: none;
    }
  }
  
  /* 淡入淡出动画 */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s ease;
  }
  
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
  
  /* 动画关键帧 */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
  
  @keyframes zoomIn {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }
  
  @keyframes bounceIn {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0; 
      transform: translateY(30px);
    }
    to { 
      opacity: 1; 
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0% { box-shadow: 0 0 20px rgba(var(--theme-color-rgb), 0.7); }
    50% { box-shadow: 0 0 40px rgba(var(--theme-color-rgb), 0.9); }
    100% { box-shadow: 0 0 20px rgba(var(--theme-color-rgb), 0.7); }
  }
  
  @keyframes confetti-fall {
    0% {
      top: -20px;
      opacity: 1;
      transform: translateY(0) rotateX(0) rotateY(0);
    }
    100% {
      top: 100%;
      opacity: 0.3;
      transform: translateY(0) rotateX(720deg) rotateY(360deg);
    }
  }
  
  @keyframes confetti-shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(15px);
    }
    50% {
      transform: translateX(-15px);
    }
    75% {
      transform: translateX(8px);
    }
    100% {
      transform: translateX(0);
    }
  }
  
  /* 响应式样式 */
  @media (max-width: 768px) {
    .content-wrapper {
      flex-direction: column;
    }
    
    .right-column {
      margin-bottom: 60px; /* 增加右侧栏底部边距 */
    }
  }
  
  @media (max-width: 768px) {
    padding-bottom: 100px;
  }
  
  @media (max-width: 480px) {
    padding-bottom: 120px;
    
    .right-column {
      margin-bottom: 90px; /* 在更小的屏幕上增加更多的底部边距 */
    }
    
    .product-info, .order-info {
      .info-row {
        flex-direction: column;
        gap: 5px;
        
        .info-label {
          width: 100%;
        }
      }
    }
    
    .action-buttons {
      .btn-group {
        flex-direction: column;
        gap: 10px;
        
        .main-action, .secondary-action {
          width: 100%;
          flex: auto;
        }
      }
    }
  }
  
  /* 弹窗样式 */
  .modal-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: opacity;
    
    .modal-backdrop {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.65);
      will-change: opacity;
    }
    
    .modal-container {
      position: relative;
      width: 100%;
      max-width: 400px;
      margin: 20px;
      will-change: transform, opacity;
    }
    
    .modal-card {
      position: relative;
      background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
      border-radius: 20px;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(var(--theme-color-rgb), 0.1);
      overflow: hidden;
      transform: translateZ(0);
      backface-visibility: hidden;
      
      .close-button {
        position: absolute;
        top: 15px;
        right: 15px;
        height: 44px;
        width: 44px;
        padding: 0;
        border-radius: 10px;
        background-color: transparent;
        color: var(--text-color);
        font-size: 22px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-color);
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
        z-index: 10;
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
      }
      
      .modal-header {
        padding: 28px 24px 20px;
        text-align: center;
        
        .icon-wrapper {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          
          &.warning {
            background-color: rgba(255, 152, 0, 0.15);
            color: #ff9800;
            
            svg {
              filter: drop-shadow(0 2px 8px rgba(255, 152, 0, 0.3));
            }
          }
          
          &.payment {
            background-color: rgba(var(--theme-color-rgb), 0.15);
            color: var(--theme-color);
            
            svg {
              filter: drop-shadow(0 2px 8px rgba(var(--theme-color-rgb), 0.3));
            }
          }
        }
        
        h3 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 12px;
          color: var(--text-color);
        }
        
        p {
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 24px;
          color: var(--secondary-text-color);
          max-width: 300px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .qrcode-container {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 10px 0 20px;
          
          canvas, svg {
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
        }
        
        .payment-link {
          margin-top: 16px;
          
          .btn-link {
            padding: 10px 16px;
            background-color: transparent;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--theme-color);
            cursor: pointer;
            transition: all 0.2s ease;
            
            &:hover {
              background-color: rgba(var(--theme-color-rgb), 0.05);
              border-color: var(--theme-color);
            }
          }
        }
      }
      
        .modal-footer {
    padding: 16px 24px 28px;
    display: flex;
    gap: 16px;
    
    button {
      flex: 1;
      height: 46px;
      border-radius: 14px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.3, 0.7, 0.4, 1.5);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        transition: transform 0.5s ease-out;
      }
      
      &:active::before {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0;
        transition: transform 0.6s ease-out, opacity 0.6s ease-out;
      }
    }
    
    .btn-secondary {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      
      &:hover {
        background-color: var(--hover-color);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(0, 0, 0, 0.05);
        transition-duration: 0.1s;
      }
    }
    
    .btn-primary {
      background-color: var(--theme-color);
      color: white;
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.25);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      
      &:hover {
        background-color: var(--primary-color-hover);
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.35);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 4px 8px rgba(var(--theme-color-rgb), 0.2);
        transition-duration: 0.1s;
      }
    }
      }
    }
  }
  
  /* 弹窗动画 */
  .modal-enter-active {
    transition: opacity 0.3s ease-out;
    
    .modal-container {
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }
  
  .modal-leave-active {
    transition: opacity 0.2s ease-in;
    
    .modal-container {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }
  
  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
    
    .modal-container {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
  }
}

/* 取消订单弹窗样式 */
.cancel-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .cancel-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .cancel-modal-container {
    position: relative;
    width: 90%;
    max-width: 320px;
    z-index: 2001;
  }
  
  .cancel-modal-content {
    background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transform: translateZ(0);
    
    @media (prefers-color-scheme: dark) {
      background-color: rgba(var(--card-background-rgb, 40, 40, 40), 1);
    }
  }
  
  .cancel-modal-icon {
    margin: 24px auto 0;
    width: 48px;
    height: 48px;
    background-color: #ff980020;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ff9800;
  }
  
  .cancel-modal-header {
    padding: 16px 24px;
    text-align: center;
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--text-color);
    }
    
    p {
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
      color: var(--secondary-text-color);
    }
  }
  
  .cancel-modal-actions {
    display: flex;
    padding: 0 16px 20px;
    gap: 12px;
    
    button {
      flex: 1;
      padding: 10px 0;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .cancel-btn {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      box-shadow: none;
      
      &:hover {
        background-color: var(--hover-color, rgba(0, 0, 0, 0.05));
        transform: none;
        box-shadow: none;
      }
      
      &:active {
        transform: none;
        box-shadow: none;
      }
    }
    
    .confirm-btn {
      background-color: #ff4d4f;
      color: white;
      
      &:hover {
        background-color: #ff7875;
      }
    }
  }
}

/* 动画 */
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

/* 订单状态样式 */
.status-info {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  width: 100%;
}

.order-status-notice {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border-radius: 12px;
  width: 100%;
  transition: all 0.5s ease; /* 添加基本过渡效果 */
  
  /* 状态过渡动画类 */
  &.status-transition {
    animation: status-change 0.5s ease;
  }
  
  .status-icon {
    margin-right: 1.5rem;
  }
  
  .status-text {
    flex: 1;
    
    h3 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      font-weight: 600;
      transition: color 0.5s ease; /* 添加颜色过渡效果 */
    }
    
    p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.4;
      transition: all 0.5s ease; /* 添加文本过渡效果 */
    }
    
    // 待激活状态下h3元素不需要底部margin
    h3.activate-status {
      margin-bottom: 0;
    }
  }
  
  /* 当没有副文本时，应用居中样式 */
  &.status-free-confirm {
    flex-direction: column;
    justify-content: center;
    text-align: center;
    
    .status-icon {
      margin-right: 0;
      margin-bottom: 1rem;
    }
    
    .status-text h3 {
      margin-bottom: 0;
    }
  }
  
  &.status-pending {
    background-color: rgba(255, 152, 0, 0.12);
    border: 1px solid rgba(255, 152, 0, 0.2);
    
    .status-icon {
      color: #ff9800;
    }
    
    h3 {
      color: #f57c00;
    }
  }
  
  &.status-processing {
    background-color: rgba(33, 150, 243, 0.12);
    border: 1px solid rgba(33, 150, 243, 0.2);
    
    .status-icon {
      color: #2196f3;
    }
    
    h3 {
      color: #1976d2;
    }
  }
  
  &.status-cancelled {
    background-color: rgba(244, 67, 54, 0.12);
    border: 1px solid rgba(244, 67, 54, 0.2);
    
    .status-icon {
      color: #f44336;
    }
    
    h3 {
      color: #d32f2f;
    }
  }
  
  &.status-completed {
    background-color: rgba(76, 175, 80, 0.12);
    border: 1px solid rgba(76, 175, 80, 0.2);
    
    .status-icon {
      color: #4caf50;
    }
    
    h3 {
      color: #388e3c;
    }
  }
  
  &.status-discounted {
    background-color: rgba(156, 39, 176, 0.12);
    border: 1px solid rgba(156, 39, 176, 0.2);
    
    .status-icon {
      color: #9c27b0;
    }
    
    h3 {
      color: #7b1fa2;
    }
  }
  
  &.status-unknown {
    background-color: rgba(158, 158, 158, 0.12);
    border: 1px solid rgba(158, 158, 158, 0.2);
    
    .status-icon {
      color: #9e9e9e;
    }
    
    h3 {
      color: #757575;
    }
  }
}

.rotating-icon {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 状态变化动画 */
@keyframes status-change {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style> 