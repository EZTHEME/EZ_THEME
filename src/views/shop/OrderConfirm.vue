<template>
  <div class="order-confirm-container">
    <div class="order-confirm-inner">
      <!-- 页面标题 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('order.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('order.description') }}</p>
        </div>
      </div>
      
      <!-- 用户现有套餐提示 -->
      <div class="alert-card" v-if="showExistingPlanWarning">
        <div class="alert-icon">
          <IconAlertTriangle :size="22" />
        </div>
        <div class="alert-content">
          <h4>{{ $t('order.existing_plan_warning_title') }}</h4>
          <p>{{ $t('order.existing_plan_warning_desc') }}</p>
        </div>
      </div>
      
      <!-- 内容主体 -->
      <div class="content-wrapper">
        <!-- 左侧内容：套餐信息和周期选择 -->
        <div class="left-column">
          <!-- 套餐信息卡片 - 骨架屏 -->
          <div class="plan-card glassmorphism" v-if="loading.plan">
            <div class="skeleton-card">
              <div class="skeleton-header"></div>
              <div class="skeleton-body">
                <div class="skeleton-title"></div>
                <div class="skeleton-features">
                  <div class="skeleton-feature" v-for="j in 4" :key="'feature-'+j"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 套餐信息卡片 - 实际内容 -->
          <div class="plan-card glassmorphism" v-else-if="plan">
            <div class="card-header">
              <h3 class="card-title">{{ plan.name }}</h3>
              <div class="card-badge" :class="getStockBadgeClass(plan)">
                <IconBox :size="16" class="badge-icon" />
                <span>{{ getPlanStockText(plan) }}</span>
              </div>
            </div>
            
            <div class="card-body">
              <!-- 套餐详细信息 -->
              <div class="plan-features">
                <!-- JSON格式内容 -->
                <template v-if="isJsonContent(plan.content)">
                  <div 
                    class="feature-item" 
                    v-for="(feature, index) in parseJsonContent(plan.content)" 
                    :key="index"
                  >
                    <IconCheck v-if="feature.support" class="feature-icon enabled" />
                    <IconX v-else class="feature-icon disabled" />
                    <span :class="{ 'disabled-text': !feature.support }">{{ feature.feature }}</span>
                  </div>
                </template>
                
                <!-- HTML格式内容 -->
                <div v-else class="html-content" v-html="plan.content"></div>
              </div>
            </div>
          </div>
          
          <!-- 周期选择 -->
          <div class="section-wrapper" v-if="!loading.plan">
            <div class="section-title">
              <span>{{ $t('order.select_period') }}</span>
            </div>
            
            <div class="period-selection">
              <!-- 周期卡片 -->
              <div class="period-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; width: 100%;">
                <div 
                  v-for="(price, type) in availablePrices" 
                  :key="type"
                  class="period-card"
                  :class="{ 'active': selectedPriceType === type }"
                  @click="selectPriceType(type)"
                >
                  <div class="period-card-inner">
                    <div class="period-type">{{ $t(`shop.plan.price_options.${getPriceTypeKey(type)}`) }}</div>
                    <div class="period-price">
                      <span class="currency">{{ currencySymbol }}</span>
                      <span class="amount">{{ (price / 100).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 周期选择骨架屏 -->
          <div class="section-wrapper" v-else>
            <div class="section-title">
              <span>{{ $t('order.select_period') }}</span>
            </div>
            
            <div class="period-selection">
              <div class="skeleton-period-cards">
                <div class="skeleton-period-card" v-for="i in 2" :key="'skeleton-period-'+i"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧内容：订单信息 -->
        <div class="right-column">
          <!-- 优惠码 -->
          <div class="section-wrapper">
            <div class="section-title">
              <span>{{ $t('order.coupon') }}</span>
            </div>
            
            <div class="coupon-input">
              <input 
                type="text" 
                v-model="couponCode" 
                :disabled="loading.plan || couponApplied"
                :placeholder="$t('order.enter_coupon')"
                class="coupon-field"
                :class="{ 'applied': couponApplied }"
              />
              <button 
                class="btn-verify" 
                @click="verifyCoupon"
                :disabled="!couponCode || verifying || loading.plan || couponApplied"
                :class="{ 'applied': couponApplied }"
              >
                <IconDiscount2 v-if="!verifying && !couponApplied" />
                <IconCheck v-else-if="couponApplied" />
                <span v-else-if="verifying" class="loader"></span>
                <span>{{ couponApplied ? $t('order.coupon_applied') : $t('order.verify_coupon') }}</span>
              </button>
              <button 
                v-if="couponApplied" 
                class="btn-remove-coupon"
                @click="removeCoupon"
              >
                <IconX :size="16" />
                <span>{{ $t('order.remove_coupon') }}</span>
              </button>
            </div>
          </div>

          <!-- 订单摘要 -->
          <div class="section-wrapper order-summary-section">
            <div class="section-title">
              <span>{{ $t('order.order_summary') }}</span>
            </div>
            
            <div class="order-summary glassmorphism">
              <!-- 骨架屏 -->
              <div v-if="loading.plan">
                <div class="summary-row skeleton">
                  <div class="summary-label skeleton-text"></div>
                  <div class="summary-value skeleton-text"></div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row skeleton total">
                  <div class="summary-label skeleton-text"></div>
                  <div class="summary-value skeleton-text"></div>
                </div>
              </div>
              
              <!-- 实际内容 -->
              <div v-else>
                <div class="summary-row">
                  <div class="summary-label">{{ $t('order.subtotal') }}</div>
                  <div class="summary-value">{{ currencySymbol }}{{ (originalPrice / 100).toFixed(2) }}</div>
                </div>
                
                <div class="summary-row" v-if="discountAmount > 0">
                  <div class="summary-label">{{ $t('order.discount') }} 
                    <span v-if="couponInfo" class="coupon-name">({{ couponInfo.name }})</span>
                  </div>
                  <div class="summary-value discount">-{{ currencySymbol }}{{ (discountAmount / 100).toFixed(2) }}</div>
                </div>
                
                <div class="summary-divider"></div>
                
                <div class="summary-row total">
                  <div class="summary-label">{{ $t('order.total') }}</div>
                  <div class="summary-value">{{ currencySymbol }}{{ (finalPrice / 100).toFixed(2) }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="action-buttons">
            <button 
              class="btn-back" 
              @click="goBack"
              :disabled="loading.plan"
            >
              <IconArrowLeft :size="18" />
              <span>{{ $t('order.back_to_shop') }}</span>
            </button>
            
            <button 
              class="btn-order" 
              @click="submitOrder"
              :disabled="!selectedPriceType || loading.submitting || loading.plan"
            >
              <IconShoppingCart v-if="!loading.submitting" :size="18" />
              <span v-else class="loader"></span>
              <span>{{ $t('order.place_order') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { getCommConfig, fetchPlanById, verifyCoupon as checkCoupon, submitOrder as createOrder } from '@/api/shop';
import { getUserInfo } from '@/api/dashboard';
import { isXboard } from '@/utils/baseConfig';
import {
  IconCheck,
  IconX,
  IconBox,
  IconShoppingCart,
  IconDiscount2,
  IconArrowLeft,
  IconAlertTriangle
} from '@tabler/icons-vue';

export default {
  name: 'OrderConfirm',
  components: {
    IconCheck,
    IconX,
    IconBox,
    IconShoppingCart,
    IconDiscount2,
    IconArrowLeft,
    IconAlertTriangle
  },
  setup() {
    const { t } = useI18n();
    const { showToast } = useToast();
    const route = useRoute();
    const router = useRouter();
    
    // 加载状态
    const loading = reactive({
      plan: true,
      userInfo: true,
      submitting: false
    });
    
    // 套餐和用户数据
    const plan = ref(null);
    const userInfo = ref(null);
    const currency = ref('CNY');
    const currencySymbol = ref('¥');
    
    // 选中的价格类型
    const selectedPriceType = ref('');
    
    // 优惠码
    const couponCode = ref('');
    const couponApplied = ref(false);
    const verifying = ref(false);
    const couponInfo = ref(null);
    const discountPercent = ref(0);
    
    // 计算原始价格
    const originalPrice = computed(() => {
      if (!plan.value || !selectedPriceType.value) return 0;
      return plan.value[selectedPriceType.value] || 0;
    });
    
    // 计算折扣金额
    const discountAmount = computed(() => {
      if (!couponApplied.value || !couponInfo.value) return 0;
      
      if (couponInfo.value.type === 1) {
        // 固定金额折扣
        return couponInfo.value.value;
      } else if (couponInfo.value.type === 2 && discountPercent.value > 0 && originalPrice.value > 0) {
        // 百分比折扣
        return Math.round(originalPrice.value * (discountPercent.value / 100));
      }
      
      return 0;
    });
    
    // 计算最终价格
    const finalPrice = computed(() => {
      return Math.max(0, originalPrice.value - discountAmount.value);
    });
    
    // 获取用户是否有有效套餐
    const userHasActivePlan = computed(() => {
      if (!userInfo.value) return false;
      return userInfo.value.plan_id && userInfo.value.expired_at && userInfo.value.expired_at * 1000 > Date.now();
    });
    
    // 获取可用的价格（过滤null值）
    const availablePrices = computed(() => {
      if (!plan.value) return {};
      
      const prices = {};
      const priceTypes = ['month_price', 'quarter_price', 'half_year_price', 'year_price', 'two_year_price', 'three_year_price', 'onetime_price'];
      
      priceTypes.forEach(type => {
        if (plan.value[type] !== null) {
          prices[type] = plan.value[type];
        }
      });
      
      return prices;
    });
    
    // 计算最佳性价比周期
    const bestValuePeriod = computed(() => {
      if (!plan.value) return '';
      
      // 周期价值权重（月为基准）
      const valueWeight = {
        month_price: 1,
        quarter_price: 3,
        half_year_price: 6,
        year_price: 12,
        two_year_price: 24,
        three_year_price: 36,
        onetime_price: 12 // 假设一次性计划相当于一年
      };
      
      let bestPeriod = '';
      let bestValue = 0;
      
      Object.entries(availablePrices.value).forEach(([type, price]) => {
        if (price <= 0) return;
        
        // 计算月均价值
        const monthlyValue = valueWeight[type] / price;
        
        if (monthlyValue > bestValue) {
          bestValue = monthlyValue;
          bestPeriod = type;
        }
      });
      
      return bestPeriod;
    });
    
    // 获取套餐库存状态文本
    const getPlanStockText = (plan) => {
      if (plan.capacity_limit === 0) {
        return t('shop.plan.stock.sold_out');
      } else if (plan.capacity_limit > 0 && plan.capacity_limit < 5) {
        return t('shop.plan.stock.warning');
      } else {
        return t('shop.plan.stock.plenty');
      }
    };
    
    // 获取套餐库存状态类
    const getStockBadgeClass = (plan) => {
      if (plan.capacity_limit === 0) {
        return 'stock-danger';
      } else if (plan.capacity_limit > 0 && plan.capacity_limit < 5) {
        return 'stock-warning';
      } else {
        return 'stock-plenty';
      }
    };
    
    // 获取价格类型key（用于i18n）
    const getPriceTypeKey = (type) => {
      const keyMap = {
        month_price: 'month',
        quarter_price: 'quarter',
        half_year_price: 'half_year',
        year_price: 'year',
        two_year_price: 'two_year',
        three_year_price: 'three_year',
        onetime_price: 'onetime'
      };
      return keyMap[type] || '';
    };
    
    // 判断内容是否为JSON格式
    const isJsonContent = (content) => {
      if (!content) return false;
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) && parsed.length > 0 && Object.prototype.hasOwnProperty.call(parsed[0], 'feature');
      } catch (e) {
        return false;
      }
    };
    
    // 解析JSON格式的内容
    const parseJsonContent = (content) => {
      try {
        return JSON.parse(content);
      } catch (e) {
        return [];
      }
    };
    
    // 选择价格类型
    const selectPriceType = (type) => {
      selectedPriceType.value = type;
    };
    
    // 验证优惠码
    const verifyCoupon = async () => {
      if (!couponCode.value || verifying.value) return;
      
      verifying.value = true;
      
      try {
        const response = await checkCoupon(couponCode.value, plan.value.id);
        
        if (response.data) {
          couponApplied.value = true;
          // 保存优惠券详细信息
          couponInfo.value = response.data;
          
          // 显示API返回的message（如果有）
          if (response.message) {
            showToast(response.message, 'success');
          }
          
          // 无论是否有message，都处理优惠券数据
          // 根据优惠券类型计算折扣
          if (response.data.type === 1) {
            // 固定金额折扣（单位：分）
            discountAmount.value = response.data.value;
            discountPercent.value = 0; // 清空百分比折扣
            if (!response.message) {
              showToast(t('order.coupon_success_fixed', { 
                code: couponCode.value, 
                amount: (response.data.value / 100).toFixed(2) 
              }), 'success');
            }
          } else if (response.data.type === 2) {
            // 百分比折扣
            // 在Xboard面板中，百分比折扣的计算方式特殊处理
            discountPercent.value = couponInfo.value.value;
            
            // Xboard面板类型特殊处理
            if (isXboard()) {
              // Xboard面板：直接计算折扣金额 = 原始价格 * 折扣百分比 / 100
              const calculatedDiscountAmount = Math.round(originalPrice.value * (discountPercent.value / 100));
              // 保存折扣金额到couponInfo中，以便computed属性使用
              couponInfo.value.calculatedDiscountAmount = calculatedDiscountAmount;
            }
            
            if (!response.message) {
              showToast(t('order.coupon_success_percent', { 
                code: couponCode.value, 
                percent: couponInfo.value.value 
              }), 'success');
            }
          } else if (!response.message) {
            showToast(t('order.coupon_success', { code: couponCode.value }), 'success');
          }
        } else {
          couponApplied.value = false;
          discountPercent.value = 0;
          discountAmount.value = 0;
          couponInfo.value = null;
          // 无论哪种面板类型，出错时都优先使用API返回的message
          showToast(response.message || t('order.coupon_invalid'), 'error');
        }
      } catch (error) {
        console.error('验证优惠码失败:', error);
        couponApplied.value = false;
        discountPercent.value = 0;
        discountAmount.value = 0;
        couponInfo.value = null;
        // 优先使用API错误响应中的message
        showToast(error.response?.message || error.message || t('order.coupon_invalid'), 'error');
      } finally {
        verifying.value = false;
      }
    };
    
    // 提交订单
    const submitOrder = async () => {
      if (!selectedPriceType.value || loading.submitting) return;
      
      loading.submitting = true;
      
      try {
        // 使用普通JavaScript对象，避免传递响应式对象
        const orderData = {
          plan_id: Number(plan.value.id),
          period: selectedPriceType.value
        };
        
        // 如果有优惠码，添加到请求数据中
        if (couponApplied.value && couponCode.value && couponInfo.value) {
          orderData.coupon_code = couponCode.value;
        }
        
        const response = await createOrder(orderData);
        
        if (response.data) {
          // 优先使用API返回的message
          showToast(response.message || t('order.order_success'), 'success');
          
          // 跳转到支付页面
          router.push({
            path: '/payment',
            query: {
              trade_no: response.data
            }
          });
        } else {
          // 优先使用API返回的message
          showToast(response.message || t('order.order_failed'), 'error');
        }
      } catch (error) {
        console.error('提交订单失败:', error);
        // 优先使用API错误响应中的message
        showToast(error.response?.message || error.message || t('order.order_failed'), 'error');
      } finally {
        loading.submitting = false;
      }
    };
    
    // 返回商店
    const goBack = () => {
      router.push('/shop');
    };
    
    // 获取套餐数据
    const fetchPlanData = async () => {
      loading.plan = true;
      try {
        if (!route.query.id) {
          showToast(t('order.no_plan_selected'), 'error');
          router.push('/shop');
          return;
        }
        
        const response = await fetchPlanById(route.query.id);
        if (response.data) {
          plan.value = response.data;
          
          // 初始选择购买周期
          if (route.query.period && plan.value[route.query.period] !== null) {
            selectedPriceType.value = route.query.period;
          } else {
            // 默认选择第一个有效价格
            const firstValidPriceType = Object.keys(availablePrices.value)[0];
            selectedPriceType.value = firstValidPriceType || '';
          }
        } else {
          // 优先使用API返回的message
          showToast(response.message || t('order.plan_not_found'), 'error');
          router.push('/shop');
        }
      } catch (error) {
        console.error('获取套餐数据失败:', error);
        // 优先使用API错误响应中的message
        showToast(error.response?.message || error.message || t('order.failed_to_fetch_plan'), 'error');
      } finally {
        loading.plan = false;
      }
    };
    
    // 获取用户信息
    const fetchUserInfo = async () => {
      loading.userInfo = true;
      try {
        const response = await getUserInfo();
        if (response.data) {
          userInfo.value = response.data;
        } else if (response.message) {
          // 显示API返回的错误消息
          showToast(response.message, 'warning');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 优先使用API错误响应中的message
        showToast(error.response?.message || error.message || t('dashboard.userinfo_error'), 'error');
      } finally {
        loading.userInfo = false;
      }
    };
    
    // 获取系统配置
    const fetchConfig = async () => {
      try {
        const response = await getCommConfig();
        if (response.data) {
          currency.value = response.data.currency || 'CNY';
          currencySymbol.value = response.data.currency_symbol || '¥';
        } else if (response.message) {
          // 显示API返回的错误消息
          showToast(response.message, 'warning');
        }
      } catch (error) {
        console.error('获取系统配置失败:', error);
        // 优先使用API错误响应中的message
        showToast(error.response?.message || error.message || t('shop.config_error'), 'error');
      }
    };
    
    // 移除优惠码
    const removeCoupon = () => {
      couponCode.value = '';
      couponApplied.value = false;
      discountPercent.value = 0;
      couponInfo.value = null;
      showToast(t('order.coupon_removed'), 'info');
    };
    
    // 计算是否应该显示已有套餐警告
    const showExistingPlanWarning = computed(() => {
      // 只有当用户信息和套餐信息都已加载完成时才可能显示警告
      if (loading.userInfo || loading.plan || !plan.value || !userInfo.value) {
        return false;
      }
      
      // 只有当用户有有效套餐且该套餐与当前选择的不同时才显示警告
      return userHasActivePlan.value && plan.value.id !== userInfo.value.plan_id;
    });
    
    // 页面加载时获取数据
    onMounted(async () => {
      await Promise.all([fetchPlanData(), fetchUserInfo(), fetchConfig()]);
    });
    
    return {
      plan,
      userInfo,
      loading,
      currency,
      currencySymbol,
      selectedPriceType,
      couponCode,
      couponApplied,
      verifying,
      couponInfo,
      originalPrice,
      discountAmount,
      finalPrice,
      userHasActivePlan,
      availablePrices,
      bestValuePeriod,
      getPriceTypeKey,
      isJsonContent,
      parseJsonContent,
      selectPriceType,
      verifyCoupon,
      submitOrder,
      goBack,
      getPlanStockText,
      getStockBadgeClass,
      removeCoupon,
      showExistingPlanWarning
    };
  }
};
</script>

<style lang="scss" scoped>
.order-confirm-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  margin-top: 20px; /* 减小顶部间距 */
  min-height: calc(100vh - 100px);
  
  .order-confirm-inner {
    width: 100%;
    max-width: 1200px; /* 修改最大宽度 */
    padding-bottom: 100px; /* 增加底部间距，避免被底部导航栏遮挡 */
  }
  
  /* 欢迎卡片样式 */
  .welcome-card {
    margin-bottom: 24px;
    background-color: var(--card-bg-color);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 20px;
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
        margin: 0;
        color: var(--secondary-text-color);
        font-size: 14px;
        line-height: 1.6;
      }
    }
  }
  
  /* 警告卡片样式 */
  .alert-card {
    background-color: rgba(255, 152, 0, 0.08);
    border: 1px solid rgba(255, 152, 0, 0.2);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    width: 100%;
    box-shadow: 0 4px 15px rgba(255, 152, 0, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 152, 0, 0.15);
    }
    
    .alert-icon {
      margin-right: 14px;
      color: #ff9800;
      flex-shrink: 0;
      background-color: rgba(255, 152, 0, 0.1);
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      
      svg {
        width: 28px;
        height: 28px;
      }
    }
    
    .alert-content {
      flex: 1;
      min-width: 0;
      
      h4 {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 6px 0;
        color: #ff9800;
        letter-spacing: 0.2px;
      }
      
      p {
        font-size: 14px;
        margin: 0;
        color: var(--secondary-text-color);
        line-height: 1.5;
      }
    }
  }
  
  /* 内容主体样式 */
  .content-wrapper {
    display: flex;
    gap: 30px;
    
    /* 左侧内容列 */
    .left-column {
      flex: 1;
      min-width: 0; /* 确保弹性子项可以收缩 */
    }
    
    /* 右侧内容列 */
    .right-column {
      flex: 1;
      min-width: 0; /* 确保弹性子项可以收缩 */
    }
  }
  
  /* 标题样式 */
  .section-wrapper {
    margin-bottom: 25px;
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: var(--text-color);
      position: relative;
      padding-left: 14px;
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 18px;
        background-color: var(--theme-color);
        border-radius: 2px;
      }
    }
  }
  
  /* 套餐卡片样式 */
  .plan-card {
    background-color: var(--card-bg-color);
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    padding: 24px;
    margin-bottom: 25px;
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
    
    &.glassmorphism {
      background-color: rgba(var(--card-background-rgb, 255, 255, 255), 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      will-change: backdrop-filter, background-color;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      
      .card-title {
        font-size: 20px;
        font-weight: 600;
        margin: 0;
        letter-spacing: 0.3px;
        color: var(--text-color);
      }
      
      .card-badge {
        display: flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        will-change: backdrop-filter, background-color, color;
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        
        &.stock-plenty {
          background-color: rgba(76, 175, 80, 0.2);
          border-color: rgba(76, 175, 80, 0.1);
          color: #4caf50;
        }
        
        &.stock-warning {
          background-color: rgba(255, 152, 0, 0.2);
          border-color: rgba(255, 152, 0, 0.1);
          color: #ff9800;
        }
        
        &.stock-danger {
          background-color: rgba(244, 67, 54, 0.2);
          border-color: rgba(244, 67, 54, 0.1);
          color: #f44336;
        }
        
        .badge-icon {
          margin-right: 4px;
        }
      }
    }
    
    .card-body {
      .plan-features {
        margin: 0;
        
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 14px;
          
          .feature-icon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            
            &.enabled {
              color: var(--theme-color);
            }
            
            &.disabled {
              color: #ccc;
            }
          }
          
          span {
            font-size: 14px;
            color: var(--text-color);
            line-height: 1.5;
            
            &.disabled-text {
              color: #999;
            }
          }
        }
        
        .html-content {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-color);
        }
      }
    }
  }
  
  /* 周期选择样式 */
  .period-selection {
    margin-bottom: 20px;
    width: 100%;
    
    .skeleton-period-cards {
      display: flex;
      gap: 16px;
      overflow-x: hidden; /* 防止溢出 */
      padding-bottom: 8px;
      width: 100%;
      
      .skeleton-period-card {
        flex: 1;
        min-width: 0; /* 允许收缩 */
        height: 100px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        
        /* 添加流动效果 */
        &::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          width: 30%;
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0) 0%, 
            rgba(255, 255, 255, 0.15) 50%, 
            rgba(255, 255, 255, 0) 100%);
          transform: translateX(-100%);
          animation: shimmer 2s infinite;
          will-change: transform;
        }
      }
    }
    
    .period-cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 15px;
      width: 100%;
      
      .period-card {
        cursor: pointer;
        border-radius: 12px;
        overflow: hidden;
        border: 2px solid var(--border-color);
        transition: all 0.3s ease;
        position: relative;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        
        &.active {
          border-color: var(--theme-color);
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(var(--theme-color-rgb), 0.15);
          
          .period-card-inner {
            background-color: rgba(var(--theme-color-rgb), 0.1);
          }
          
          .period-price {
            .currency,
            .amount {
              color: var(--theme-color);
            }
          }
        }
        
        &:hover:not(.active) {
          transform: translateY(-3px);
          border-color: rgba(var(--theme-color-rgb), 0.3);
          box-shadow: 0 3px 10px rgba(var(--theme-color-rgb), 0.1);
        }
        
        .period-card-inner {
          background-color: var(--card-bg-color);
          padding: 16px 12px !important;
          min-height: 90px !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s ease;
        }
        
        .period-type {
          font-size: 14px !important;
          font-weight: 600;
          margin-bottom: 8px !important;
          color: var(--text-color);
          letter-spacing: 0.2px;
          text-align: center;
        }
        
        .period-price {
          margin-bottom: 8px;
          text-align: center;
          
          .currency {
            font-size: 14px !important;
            font-weight: 500;
            color: var(--text-color);
          }
          
          .amount {
            font-size: 24px !important;
            font-weight: 700;
            color: var(--text-color);
          }
        }
        
        .period-badge {
          display: none;
        }
      }
    }
  }
  
  /* 优惠码输入样式 */
  .coupon-input {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    
    .coupon-field {
      flex: 1;
      height: 48px;
      padding: 0 18px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      background-color: var(--input-bg-color);
      color: var(--text-color);
      font-size: 14px;
      outline: none;
      transition: all 0.3s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
      min-width: 0; /* 允许输入框收缩 */
      
      &.applied {
        border-color: #4caf50;
        background-color: rgba(76, 175, 80, 0.05);
      }
      
      &:focus:not(.applied) {
        border-color: rgba(var(--theme-color-rgb), 0.5);
        box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.2);
        transform: translateY(-1px);
      }
      
      &::placeholder {
        color: var(--secondary-text-color);
        opacity: 0.6;
      }
    }
    
    .btn-verify {
      height: 48px;
      padding: 0 24px;
      border-radius: 10px;
      background-color: var(--theme-color);
      color: white;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.2);
      white-space: nowrap; /* 防止文本换行 */
      flex-shrink: 0; /* 防止按钮收缩 */
      
      &.applied {
        background-color: #4caf50;
        box-shadow: 0 4px 10px rgba(76, 175, 80, 0.2);
        cursor: default;
      }
      
      &:hover:not(:disabled):not(.applied) {
        background-color: color-mix(in srgb, var(--theme-color) 85%, black) !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(var(--theme-color-rgb), 0.3);
      }
      
      &:disabled {
        opacity: 0.6;
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
    
    .btn-remove-coupon {
      height: 48px;
      padding: 0 16px;
      border-radius: 10px;
      background-color: #f44336;
      color: white;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(244, 67, 54, 0.2);
      white-space: nowrap; /* 防止文本换行 */
      flex-shrink: 0; /* 防止按钮收缩 */
      
      &:hover {
        background-color: #d32f2f;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(244, 67, 54, 0.3);
      }
    }
  }
  
  /* 订单摘要样式 */
  .order-summary {
    background-color: var(--card-bg-color);
    border-radius: 16px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 24px;
    margin-bottom: 20px;
    border: 1px solid var(--border-color);
    
    &.glassmorphism {
      background-color: rgba(var(--card-background-rgb, 255, 255, 255), 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      align-items: center;
      
      &.skeleton {
        margin-bottom: 16px;
      }
      
      .summary-label {
        font-size: 14px;
        color: var(--secondary-text-color);
        letter-spacing: 0.2px;
        
        .coupon-name {
          font-size: 12px;
          opacity: 0.8;
          font-style: italic;
        }
      }
      
      .summary-value {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-color);
        
        &.discount {
          color: #f44336;
          font-weight: 600;
        }
      }
      
      &.total {
        margin-top: 8px;
        margin-bottom: 0;
        
        .summary-label {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color);
        }
        
        .summary-value {
          font-size: 22px;
          font-weight: 700;
          color: var(--theme-color);
        }
      }
    }
    
    .summary-divider {
      height: 1px;
      background-color: var(--border-color);
      margin: 16px 0;
    }
  }
  
  .order-summary-section {
    margin-top: 0;
  }
  
  /* 操作按钮样式 */
  .action-buttons {
    display: flex;
    justify-content: space-between;
    margin: 30px 0 40px 0;
    gap: 16px;
    
    .btn-back {
      height: 44px;
      padding: 0 20px;
      border-radius: 10px;
      background-color: transparent;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
    }
    
    .btn-order {
      height: 44px;
      padding: 0 24px;
      border-radius: 10px;
      background-color: var(--theme-color);
      color: white;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(var(--theme-color-rgb), 0.2);
      will-change: transform, box-shadow;
      
      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, var(--theme-color) 85%, black) !important;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(var(--theme-color-rgb), 0.3);
      }
      
      &:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(var(--theme-color-rgb), 0.2);
      }
      
      &:disabled {
        opacity: 0.6;
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

/* 骨架屏样式 */
.skeleton-card {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden; /* 确保内容不溢出 */
  border-radius: 10px;
  
  .skeleton-header {
    height: 24px;
    width: 60%;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 6px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }
  
  .skeleton-body {
    .skeleton-title {
      height: 40px;
      width: 100%;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    
    .skeleton-features {
      margin-bottom: 24px;
      
      .skeleton-feature {
        height: 16px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 6px;
        margin-bottom: 12px;
        position: relative;
        overflow: hidden;
        
        &:nth-child(1) { width: 92%; }
        &:nth-child(2) { width: 85%; }
        &:nth-child(3) { width: 88%; }
        &:nth-child(4) { width: 80%; }
      }
    }
  }
  
  /* 添加流动效果 - 改进版本 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 30%;
    background: linear-gradient(90deg, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.15) 50%, 
      rgba(255, 255, 255, 0) 100%);
    transform: translateX(-100%);
    animation: shimmer 2s infinite;
    will-change: transform;
    pointer-events: none;
  }
}

/* 骨架屏文本 */
.skeleton-text {
  height: 16px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  width: 100px;
  
  &:first-child {
    width: 70%;
  }
}

/* 骨架屏动画 */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式样式 */
@media (max-width: 991px) {
  .order-confirm-container {
    .content-wrapper {
      gap: 25px;
    }
  }
}

@media (max-width: 768px) {
  .order-confirm-container {
    margin-top: 15px;
    
    .welcome-card {
      padding: 15px;
      
      .card-header .card-title {
        font-size: 16px;
      }
      
      .card-body p {
        font-size: 13px;
      }
    }
    
    .content-wrapper {
      flex-direction: column;
      gap: 20px;
    }
    
    .action-buttons {
      position: relative;
      z-index: 1;
      margin: 24px 0 30px 0;
      display: flex;
      flex-direction: row;
      gap: 12px;
      transform: none;
      opacity: 1;
      transition: none;
      
      .btn-back, 
      .btn-order {
        flex: 1;
        min-width: 0;
        padding: 0 10px;
        justify-content: center;
        font-size: 13px;
        height: 44px;
        will-change: transform;
      }
    }
    
    .period-selection .period-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      
      .period-card {
        .period-card-inner {
          padding: 12px 8px !important;
          min-height: 80px !important;
          
          .period-type {
            font-size: 13px !important;
            margin-bottom: 6px !important;
          }
          
          .period-price {
            .currency {
              font-size: 13px !important;
            }
            
            .amount {
              font-size: 20px !important;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .order-confirm-container {
    .section-title {
      font-size: 16px;
      margin-bottom: 12px;
    }
    
    .coupon-input {
      flex-direction: row; /* 改为水平排列 */
      flex-wrap: wrap; /* 允许在需要时换行 */
      gap: 8px; /* 减小间距 */
      
      .coupon-field {
        flex: 1;
        min-width: 120px; /* 设置最小宽度 */
      }
      
      .btn-verify {
        width: auto; /* 自适应宽度 */
        padding: 0 15px; /* 减小内边距 */
        justify-content: center;
        white-space: nowrap; /* 防止文本换行 */
      }
      
      .btn-remove-coupon {
        padding: 0 12px; /* 减小内边距 */
        
        span {
          font-size: 13px; /* 减小字体大小 */
        }
      }
      
      /* 当优惠码已应用时的布局调整 */
      &:has(.coupon-field.applied) {
        .coupon-field {
          width: 100%;
          flex: none;
          margin-bottom: 8px;
        }
        
        .btn-verify, .btn-remove-coupon {
          flex: 1;
          min-width: 0;
          justify-content: center;
        }
      }
    }
    
    .plan-card, .order-summary {
      padding: 18px;
    }
    
    .period-selection .period-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      
      .period-card {
        .period-card-inner {
          min-height: 70px !important;
        }
      }
    }
  }
}

/* 暗色模式优化 */
@media (prefers-color-scheme: dark) {
  .skeleton-card,
  .skeleton-period-card,
  .skeleton-text {
    &::after {
      background: linear-gradient(90deg, 
        rgba(255, 255, 255, 0) 0%, 
        rgba(255, 255, 255, 0.08) 50%, 
        rgba(255, 255, 255, 0) 100%);
    }
  }
  
  .skeleton-header,
  .skeleton-title,
  .skeleton-feature,
  .skeleton-text,
  .skeleton-period-card {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

/* 添加更明确的媒体查询，确保在小屏幕上正确显示 */
@media screen and (max-width: 768px) {
  .order-confirm-container .period-selection .period-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
}

@media screen and (max-width: 480px) {
  .order-confirm-container .period-selection .period-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
}

/* 添加全局样式修复，确保在所有浏览器中生效 */
.order-confirm-container .period-selection .period-cards {
  display: grid !important;
}

/* 添加特定的样式，确保在移动设备上每行显示两个周期卡片 */
@media screen and (max-width: 768px) {
  .period-cards {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important;
  }
}

@media screen and (max-width: 480px) {
  .period-cards {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }
}

/* 全局样式，确保在所有屏幕尺寸下都能正确显示周期卡片 */
:deep(.period-cards) {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 15px !important;
  width: 100% !important;
}

@media screen and (max-width: 768px) {
  :deep(.period-cards) {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
}

@media screen and (max-width: 480px) {
  :deep(.period-cards) {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
}
</style> 