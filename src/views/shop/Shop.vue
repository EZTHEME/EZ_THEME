<template>
  <div class="shop-container">
    <div class="shop-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('shop.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('shop.description') }}</p>
        </div>
      </div>
      
      <!-- 套餐统计卡片组 -->
      <div class="stats-grid" v-if="SHOP_CONFIG.showPlanFeatureCards">
        <div class="stats-card animate-card">
          <div class="stats-icon">
            <IconRocket :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('shop.stats.global_nodes') }}</div>
            <div class="stats-label">{{ $t('shop.stats.global_nodes_desc') }}</div>
          </div>
        </div>
        
        <div class="stats-card animate-card">
          <div class="stats-icon">
            <IconBolt :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('shop.stats.speed') }}</div>
            <div class="stats-label">{{ $t('shop.stats.speed_desc') }}</div>
          </div>
        </div>
        
        <div class="stats-card animate-card">
          <div class="stats-icon">
            <IconDeviceTv :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('shop.stats.streaming') }}</div>
            <div class="stats-label">{{ $t('shop.stats.streaming_desc') }}</div>
          </div>
        </div>
        
        <div class="stats-card animate-card">
          <div class="stats-icon">
            <IconDevices :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('shop.stats.devices') }}</div>
            <div class="stats-label">{{ $t('shop.stats.devices_desc') }}</div>
          </div>
        </div>
      </div>
      
      <!-- 筛选选项卡 - 设计成圆形切换按钮 -->
      <div class="filter-toggle-container">
        <div class="filter-toggle-wrapper">
          <div
            v-for="filter in filters"
            :key="`${filter.value}-${currentLanguage}`"
            class="filter-option"
            :class="{ 'active': selectedFilter === filter.value }"
            @click="setFilter(filter.value)"
          >
            <div class="option-icon">
              <IconCircleCheck v-if="selectedFilter === filter.value" />
              <IconCircle v-else />
            </div>
            <span class="option-text">{{ $t(`shop.filter.${filter.value}`) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 套餐列表 -->
      <div class="plans-wrapper">
        <!-- 无结果提示 -->
        <div class="no-plans-message" v-if="!loading.plans && filteredPlans.length === 0">
          <IconInfoCircle :size="48" class="info-icon" />
          <h3>{{ $t('shop.no_plans_found') }}</h3>
          <p>{{ $t('shop.try_different_filter') }}</p>
          <button class="btn-reset-filter" @click="selectedFilter = 'all'">
            {{ $t('shop.reset_filter') }}
          </button>
        </div>
        
        <!-- 骨架屏加载动画 -->
        <div class="dashboard-card" v-else-if="loading.plans" v-for="i in 3" :key="'skeleton-'+i">
          <div class="skeleton-card">
            <div class="skeleton-header"></div>
            <div class="skeleton-body">
              <div class="skeleton-price"></div>
              <div class="skeleton-features">
                <div class="skeleton-feature" v-for="j in 5" :key="'feature-'+j"></div>
              </div>
              <div class="skeleton-button"></div>
            </div>
          </div>
        </div>
        
        <!-- 套餐卡片 修改内容 -->
        <div class="plan-card" v-else v-for="plan in filteredPlans" :key="plan.id">
          <div class="card-header">
            <h2 class="card-title">{{ plan.name }}</h2>
            <div class="card-badge glassmorphism stock-plenty" v-if="plan.capacity_limit >= SHOP_CONFIG.lowStockThreshold || plan.capacity_limit === null">
              <IconBox :size="16" class="badge-icon" />
              <span>{{ $t('shop.plan.stock.plenty') }}</span>
            </div>
            <div class="card-badge glassmorphism stock-warning" v-else-if="plan.capacity_limit > 0 && plan.capacity_limit < SHOP_CONFIG.lowStockThreshold">
              <IconBox :size="16" class="badge-icon" />
              <span>{{ $t('shop.plan.stock.warning') }}</span>
            </div>
            <div class="card-badge glassmorphism stock-danger" v-if="plan.capacity_limit === 0">
              <IconBox :size="16" class="badge-icon" />
              <span>{{ $t('shop.plan.stock.sold_out') }}</span>
            </div>
          </div>
          <div class="card-body">
            <!-- 价格区域 - 修改为显示支持的所有周期 -->
            <div class="plan-price">
              <div class="price-display">
                <span class="currency">{{ currencySymbol }}</span>
                <span class="amount">{{ getPlanMainPrice(plan) }}</span>
                <span class="period">{{ $t(`shop.plan.periods.${getPriceTypeKey(getDisplayPriceType(plan))}`) }}</span>
              </div>
              
              <!-- 支持的周期标签 - 改进显示效果 -->
              <div class="supported-periods" v-if="!SHOP_CONFIG.hidePeriodTabs">
                <div class="period-labels">
                  <span 
                    v-for="(price, type) in getPlanPrices(plan)" 
                    :key="type"
                    class="period-tag"
                    :class="{ 
                      'active': getDisplayPriceType(plan) === type,
                      'disabled': price === null
                    }"
                    @click="price !== null && selectPlanPriceType(plan.id, type)"
                  >
                    <IconCheck v-if="price !== null" class="tag-icon check" />
                    <IconX v-else class="tag-icon error" />
                    {{ $t(`shop.plan.price_options.${getPriceTypeKey(type)}`) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 周期折扣计算 -->
            <div class="discount-calculation" v-if="SHOP_CONFIG.enableDiscountCalculation && calculateDiscount(plan).showDiscount">
              <div class="discount-info">
                <span class="period-name">{{ calculateDiscount(plan).periodName }}</span>
                <span class="discount-label">&nbsp;{{ $t('shop.plan.discount.relative') }} </span>
                <span class="discount-value">&nbsp;{{ calculateDiscount(plan).discountPercentage }}%</span>
                <span class="saving-text">，{{ $t('shop.plan.discount.savings') }} </span>
                <span class="saving-amount">&nbsp;{{ currencySymbol }}{{ calculateDiscount(plan).savingsAmount }}</span>
              </div>
            </div>
            
            <!-- 套餐特性 -->
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
            
            <!-- 购买按钮 -->
            <button 
              class="btn-purchase glassmorphism" 
              :class="{ 'btn-disabled': plan.capacity_limit === 0 }"
              @click="purchasePlan(plan)"
              :disabled="plan.capacity_limit === 0"
            >
              <IconShoppingCart class="btn-icon" />
              <span class="btn-text">{{ plan.capacity_limit === 0 ? $t('shop.plan.sold_out_btn') : $t('shop.plan.purchase') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 弹窗组件 -->
  <ShopPopup
    :show-popup="showPopup"
    :title="popupConfig.title"
    :content="popupConfig.content"
    :cooldown-hours="popupConfig.cooldownHours"
    :close-wait-seconds="popupConfig.closeWaitSeconds"
    @close="handlePopupClose"
  />
</template>

<script>
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { fetchPlans, getCommConfig } from '@/api/shop';
import { SHOP_CONFIG } from '@/utils/baseConfig';
import ShopPopup from '@/components/shop/ShopPopup.vue';
import {
  IconRocket,
  IconBolt,
  IconDeviceTv,
  IconDevices,
  IconCheck,
  IconX,
  IconShoppingCart,
  IconBox,
  IconInfoCircle,
  IconCircle,
  IconCircleCheck
} from '@tabler/icons-vue';
import { useRouter } from 'vue-router';

export default {
  name: 'ShopView',
  components: {
    IconRocket,
    IconBolt,
    IconDeviceTv,
    IconDevices,
    IconCheck,
    IconX,
    IconShoppingCart,
    IconBox,
    IconInfoCircle,
    IconCircle,
    IconCircleCheck,
    ShopPopup
  },
  setup() {
    const { t, locale } = useI18n();
    const { showToast } = useToast();
    const router = useRouter();
    
    // 加载状态
    const loading = reactive({
      plans: true,
      config: true
    });
    
    // 套餐数据
    const plans = ref([]);
    const currency = ref('CNY');
    const currencySymbol = ref('¥');
    
    // 选中的价格类型
    const selectedPriceType = reactive({});
    
    // 支付方式
    const paymentMethods = ref([]);
    
    // 筛选选项
    const selectedFilter = ref('all');
    
    // 筛选器配置
    const filterToggle = ref(null);
    
    // 筛选选项
    const filters = [
      { label: '全部', value: 'all' },
      { label: '周期性', value: 'recurring' },
      { label: '一次性', value: 'onetime' }
    ];
    
    // 弹窗相关
    const showPopup = ref(false);
    const popupConfig = reactive({
      title: '',
      content: '',
      cooldownHours: 2,
      closeWaitSeconds: 0
    });
    
    // 处理弹窗关闭事件
    const handlePopupClose = () => {
      showPopup.value = false;
    };
    
    // 初始化弹窗配置
    const initPopup = () => {
      // 从SHOP_CONFIG中获取弹窗配置
      if (SHOP_CONFIG.popup && SHOP_CONFIG.popup.enabled) {
        popupConfig.title = SHOP_CONFIG.popup.title || '';
        popupConfig.content = SHOP_CONFIG.popup.content || '';
        popupConfig.cooldownHours = SHOP_CONFIG.popup.cooldownHours || 24;
        popupConfig.closeWaitSeconds = SHOP_CONFIG.popup.closeWaitSeconds || 0;
        
        // 当cooldownHours为0时，强制每次都显示弹窗，忽略localStorage中的记录
        if (popupConfig.cooldownHours === 0) {
          showPopup.value = true;
          return;
        }
        
        // 检查是否需要显示弹窗
        const closeTime = localStorage.getItem('shop_popup_close_time');
        if (!closeTime) {
          // 首次访问，显示弹窗
          showPopup.value = true;
        } else {
          // 检查是否过了冷却期
          const now = new Date().getTime();
          const elapsed = now - parseInt(closeTime);
          const cooldownMs = popupConfig.cooldownHours * 60 * 60 * 1000;
          
          if (elapsed >= cooldownMs) {
            showPopup.value = true;
          }
        }
      }
    };
    
    // 当前语言
    const currentLanguage = computed(() => locale.value);
    
    // 设置筛选选项并更新滑块位置
    const setFilter = (filter) => {
      selectedFilter.value = filter;
    };
    
    // 获取套餐的主要价格类型（优先选择最大周期，一次性除外）
    const getPlanMainPriceType = (plan) => {
      // 使用SHOP_CONFIG中定义的周期顺序
      const priceTypes = SHOP_CONFIG.periodOrder || ['three_year_price', 'two_year_price', 'year_price', 'half_year_price', 'quarter_price', 'month_price', 'onetime_price'];
      
      // 首先尝试找出最长周期（非一次性）的选项
      const recurringTypes = priceTypes.filter(type => type !== 'onetime_price');
      const defaultRecurring = recurringTypes.find(type => plan[type] !== null);
      
      // 如果找到了周期性选项，则返回；否则尝试一次性选项
      if (defaultRecurring) {
        return defaultRecurring;
      }
      
      // 如果没有周期性选项，则检查是否有一次性选项
      if (plan.onetime_price !== null) {
        return 'onetime_price';
      }
      
      // 如果都没有，返回第一个非null选项或默认值
      return priceTypes.find(type => plan[type] !== null) || priceTypes[0];
    };
    
    // 获取套餐的主要价格
    const getPlanMainPrice = (plan) => {
      const priceType = getDisplayPriceType(plan);
      if (!priceType || plan[priceType] === null || plan[priceType] === undefined) {
        return '--';
      }
      return (plan[priceType] / 100).toFixed(2);
    };
    
    // 监听筛选器变化
    watch(() => selectedFilter.value, () => {
      // 当筛选器变化时可以添加额外处理逻辑
      console.log('筛选条件变化为:', selectedFilter.value);
    });
    
    // 监听语言变化
    watch(() => currentLanguage.value, () => {
      // 语言改变时的处理逻辑
      console.log('语言变化为:', currentLanguage.value);
    });
    
    // 初始化时不需要更新滑块位置
    onMounted(() => {
      // 初始选中"全部"
      selectedFilter.value = 'all';
    });
    
    // 获取套餐数据
    const fetchPlanData = async () => {
      loading.plans = true;
      try {
        const response = await fetchPlans();
        if (response.data) {
          plans.value = response.data;
          
          // 清空之前的选择
          Object.keys(selectedPriceType).forEach(key => {
            delete selectedPriceType[key];
          });
          
          // console.log('SHOP_CONFIG.autoSelectMaxPeriod:', SHOP_CONFIG.autoSelectMaxPeriod);
          
          // 仅当autoSelectMaxPeriod为true时，才设置默认选择
          if (SHOP_CONFIG.autoSelectMaxPeriod) {
            // console.log('执行自动选择最大周期');
            nextTick(() => {
              plans.value.forEach(plan => {
                // 使用SHOP_CONFIG中定义的周期顺序
                const priceTypes = SHOP_CONFIG.periodOrder || ['three_year_price', 'two_year_price', 'year_price', 'half_year_price', 'quarter_price', 'month_price', 'onetime_price'];
                
                // 首先尝试找出最长周期（非一次性）的选项
                const recurringTypes = priceTypes.filter(type => type !== 'onetime_price');
                const defaultRecurring = recurringTypes.find(type => plan[type] !== null);
                
                // 如果找到了周期性选项，则返回；否则尝试一次性选项
                if (defaultRecurring) {
                  selectedPriceType[plan.id] = defaultRecurring;
                } else if (plan.onetime_price !== null) {
                  selectedPriceType[plan.id] = 'onetime_price';
                } else {
                  // 如果都没有，返回第一个非null选项
                  selectedPriceType[plan.id] = priceTypes.find(type => plan[type] !== null) || priceTypes[0];
                }
              });
              // console.log('初始化选择周期完成', selectedPriceType);
            });
          } else {
            // console.log('根据配置不自动选择最大周期，不设置默认选择');
          }
        }
      } catch (error) {
        // console.error('获取套餐数据失败:', error);
        showToast('获取套餐数据失败', 'error');
      } finally {
        loading.plans = false;
      }
    };
    
    // 获取系统配置
    const fetchConfig = async () => {
      loading.config = true;
      try {
        const response = await getCommConfig();
        if (response.data) {
          currency.value = response.data.currency || 'CNY';
          currencySymbol.value = response.data.currency_symbol || '¥';
        }
      } catch (error) {
        console.error('获取系统配置失败:', error);
      } finally {
        loading.config = false;
      }
    };
    
    // 获取套餐所有价格
    const getPlanPrices = (plan) => {
      return {
        month_price: plan.month_price,
        quarter_price: plan.quarter_price,
        half_year_price: plan.half_year_price,
        year_price: plan.year_price,
        two_year_price: plan.two_year_price,
        three_year_price: plan.three_year_price,
        onetime_price: plan.onetime_price
      };
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
    
    // 获取价格类型名称
    const getPriceTypeName = (type) => {
      const nameMap = {
        month_price: '月付',
        quarter_price: '季付',
        half_year_price: '半年付',
        year_price: '年付',
        two_year_price: '两年付',
        three_year_price: '三年付',
        onetime_price: '一次性'
      };
      return nameMap[type] || '';
    };
    
    // 获取周期文本
    const getPeriodText = (type) => {
      const textMap = {
        month_price: '/ 月',
        quarter_price: '/ 季',
        half_year_price: '/ 半年',
        year_price: '/ 年',
        two_year_price: '/ 两年',
        three_year_price: '/ 三年',
        onetime_price: ''
      };
      return textMap[type] || '';
    };
    
    // 选择价格类型
    const selectPriceType = (planId, type) => {
      selectedPriceType[planId] = type;
    };
    
    // 获取选中的价格
    const getSelectedPrice = (plan) => {
      const type = selectedPriceType[plan.id];
      if (plan[type] === null) return '--';
      return (plan[type] / 100).toFixed(2);
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
    
    // 购买套餐
    const purchasePlan = (plan) => {
      if (plan.capacity_limit === 0) {
        showToast(t('shop.plan.stock.sold_out'), 'error');
        return;
      }
      
      const priceType = getDisplayPriceType(plan);
      
      // Log the price details for debugging
      // console.log(`Selected plan: ${plan.name}, Price type: ${priceType}, Price: ${plan[priceType]}`);
      
      // 跳转到订单确认页面
      router.push({
        path: 'order-confirm',
        query: { 
          id: plan.id,
          period: priceType
        }
      });
    };
    
    // 筛选后的套餐列表
    const filteredPlans = computed(() => {
      if (selectedFilter.value === 'all') {
        return plans.value;
      } else if (selectedFilter.value === 'recurring') {
        return plans.value.filter(plan => hasRecurringPrice(plan) && !isOnetimeOnly(plan));
      } else if (selectedFilter.value === 'onetime') {
        return plans.value.filter(plan => plan.onetime_price !== null);
      }
      return plans.value;
    });
    
    // 检查套餐是否有周期性价格
    const hasRecurringPrice = (plan) => {
      const recurringTypes = ['month_price', 'quarter_price', 'half_year_price', 'year_price', 'two_year_price', 'three_year_price'];
      return recurringTypes.some(type => plan[type] !== null);
    };
    
    // 检查套餐是否只提供一次性价格
    const isOnetimeOnly = (plan) => {
      const recurringTypes = ['month_price', 'quarter_price', 'half_year_price', 'year_price', 'two_year_price', 'three_year_price'];
      return plan.onetime_price !== null && !recurringTypes.some(type => plan[type] !== null);
    };
    
    // 修改selectPlanPriceType函数，使其能更新显示价格
    const selectPlanPriceType = (planId, type) => {
      // 只有当价格不为null时才更新选中的价格类型
      const plan = plans.value.find(p => p.id === planId);
      if (plan && plan[type] !== null) {
        selectedPriceType[planId] = type;
      }
    };
    
    // 添加一个新函数来获取显示的价格类型
    const getDisplayPriceType = (plan) => {
      // 如果已经选择了价格类型，则使用选择的类型
      if (selectedPriceType[plan.id]) {
        // console.log(`已选择的价格类型: ${selectedPriceType[plan.id]} (套餐ID: ${plan.id})`);
        return selectedPriceType[plan.id];
      }
      
      // 如果允许自动选择，则使用主要价格类型（最长周期）
      if (SHOP_CONFIG.autoSelectMaxPeriod) {
        const priceType = getPlanMainPriceType(plan);
        // console.log(`自动选择最大周期: ${priceType} (套餐ID: ${plan.id})`);
        return priceType;
      }
      
      // 如果不允许自动选择，则尝试获取第一个可用的价格
      const availablePrices = Object.entries(getPlanPrices(plan))
        .filter(([, price]) => price !== null)
        .map(([type]) => type);
      
      if (availablePrices.length > 0) {
        // console.log(`不自动选择时显示第一个可用价格: ${availablePrices[0]} (套餐ID: ${plan.id})`);
        // 但不保存到selectedPriceType中，因为用户没有明确选择
        return availablePrices[0];
      }
      
      // 如果没有可用价格，返回空字符串
      // console.log(`没有可用价格 (套餐ID: ${plan.id})`);
      return '';
    };
    
    // 组件加载时初始化
    onMounted(async () => {
      try {
        // 加载套餐信息和配置
        loading.plans = true;
        await Promise.all([fetchPlanData(), fetchConfig()]);
        loading.plans = false;
        
        // 确保DOM更新完成再初始化弹窗
        nextTick(() => {
          // 当cooldownHours为0时，清除关闭记录，确保每次访问都显示弹窗
          if (SHOP_CONFIG.popup && SHOP_CONFIG.popup.enabled && SHOP_CONFIG.popup.cooldownHours === 0) {
            localStorage.removeItem('shop_popup_close_time');
          }
          initPopup();
        });
      } catch (error) {
        console.error('加载数据失败:', error);
        loading.plans = false;
      }
    });
    
    // 添加一个新的函数来计算周期折扣
    const calculateDiscount = (plan) => {
      // 检查是否有月付价格，没有月付就无法计算折扣
      if (!plan.month_price) {
        return { showDiscount: false, periodName: '', discountPercentage: 0, savingsAmount: 0 };
      }
      
      const monthlyPrice = plan.month_price / 100; // 转换为元
      
      // 计算可用的周期及其价格
      const availablePeriods = [
        { type: 'three_year_price', price: plan.three_year_price ? plan.three_year_price / 100 : null, months: 36, name: t('shop.plan.price_options.three_year') },
        { type: 'two_year_price', price: plan.two_year_price ? plan.two_year_price / 100 : null, months: 24, name: t('shop.plan.price_options.two_year') },
        { type: 'year_price', price: plan.year_price ? plan.year_price / 100 : null, months: 12, name: t('shop.plan.price_options.year') },
        { type: 'half_year_price', price: plan.half_year_price ? plan.half_year_price / 100 : null, months: 6, name: t('shop.plan.price_options.half_year') },
        { type: 'quarter_price', price: plan.quarter_price ? plan.quarter_price / 100 : null, months: 3, name: t('shop.plan.price_options.quarter') }
      ].filter(period => period.price !== null);
      
      // 检查是否只有一个支付周期（月付）或者没有其他支付周期
      if (availablePeriods.length === 0) {
        return { showDiscount: false, periodName: '', discountPercentage: 0, savingsAmount: 0 };
      }
      
      // 按照优先级选择周期（三年 > 两年 > 一年 > 季度）
      const selectedPeriod = availablePeriods[0];
      
      // 计算总月付价格
      const totalMonthlyPrice = monthlyPrice * selectedPeriod.months;
      
      // 计算折扣
      const discountPercentage = ((totalMonthlyPrice - selectedPeriod.price) / totalMonthlyPrice) * 100;
      
      // 节省金额 = 月付总价 - 长周期价格
      const savingsAmount = (totalMonthlyPrice - selectedPeriod.price).toFixed(2);
      
      // 只有在折扣为正数且折扣百分比大于1%时才显示（避免舍入误差）
      return {
        showDiscount: discountPercentage > 1,
        periodName: selectedPeriod.name,
        discountPercentage: discountPercentage.toFixed(0), // 整数显示折扣率
        savingsAmount: savingsAmount
      };
    };
    
    return {
      plans,
      loading,
      currency,
      currencySymbol,
      paymentMethods,
      selectedPriceType,
      selectedFilter,
      filteredPlans,
      getPlanPrices,
      getPriceTypeKey,
      getPriceTypeName,
      getPeriodText,
      selectPriceType,
      getSelectedPrice,
      isJsonContent,
      parseJsonContent,
      purchasePlan,
      filterToggle,
      filters,
      setFilter,
      getPlanMainPrice,
      getPlanMainPriceType,
      currentLanguage,
      selectPlanPriceType,
      getDisplayPriceType,
      showPopup,
      popupConfig,
      handlePopupClose,
      initPopup,
      SHOP_CONFIG,
      calculateDiscount
    };
  }
};
</script>

<style lang="scss" scoped>
.shop-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  
  .shop-inner {
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
    
    &:hover {
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      border-color: rgba(var(--theme-color-rgb), 0.3);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      
      .card-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        flex: 1;
        padding-right: 10px;
      }
      
      .card-badge {
        display: flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        margin-left: 8px;
        white-space: nowrap;
        flex-shrink: 0;
        
        &.glassmorphism {
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
        }
        
        .badge-icon {
          margin-right: 4px;
        }
      }
    }
  }
  
  /* 骨架屏样式 */
  .skeleton-card {
    width: 100%;
    height: 100%;
    
    .skeleton-header,
    .skeleton-price,
    .skeleton-feature,
    .skeleton-button {
      position: relative;
      overflow: hidden;
      
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
        animation: shimmer 2.5s infinite;
      }
    }
    
    .skeleton-header {
      height: 24px;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      margin-bottom: 20px;
      width: 60%;
    }
    
    .skeleton-body {
      .skeleton-price {
        height: 60px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
        margin-bottom: 24px;
      }
      
      .skeleton-features {
        margin-bottom: 24px;
        
        .skeleton-feature {
          height: 16px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          margin-bottom: 12px;
          
          &:nth-child(1) { width: 90%; }
          &:nth-child(2) { width: 80%; }
          &:nth-child(3) { width: 85%; }
          &:nth-child(4) { width: 75%; }
          &:nth-child(5) { width: 70%; }
        }
      }
      
      .skeleton-button {
        height: 48px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 8px;
      }
    }
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.3; }
    100% { opacity: 0.6; }
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
  
  .plans-wrapper {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 24px;
    
    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
    
    .dashboard-card {
      border-radius: 16px;
      overflow: hidden;
    }
    
    .plan-card {
      background-color: var(--card-bg-color);
      border-radius: 16px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      padding: 24px;
      border: 1px solid var(--border-color);
      transition: all 0.3s ease;
      position: relative;
      display: flex;
      flex-direction: column;
      height: auto;
      
      &:hover {
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        border-color: rgba(var(--theme-color-rgb), 0.3);
        transform: translateY(-5px);
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 15px;
        
        .card-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          flex: 1;
          padding-right: 10px;
        }
        
        .card-badge {
          display: flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          margin-left: 8px;
          white-space: nowrap;
          flex-shrink: 0;
          
          &.glassmorphism {
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
          }
          
          .badge-icon {
            margin-right: 4px;
          }
        }
      }
      
      .card-body {
        position: relative;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    }
    
    .plan-price {
      margin: 24px 0;
      padding: 0 4px;
      
      .price-display {
        text-align: center;
        margin-bottom: 12px;
        
        .currency {
          font-size: 24px;
          font-weight: 500;
          color: var(--text-color);
        }
        
        .amount {
          font-size: 48px;
          font-weight: 700;
          color: var(--text-color);
        }
        
        .period {
          font-size: 16px;
          color: var(--secondary-text-color);
        }
      }
      
      .supported-periods {
        margin-top: 15px;
        
        .period-labels {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
          
          .period-tag {
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            background-color: rgba(var(--border-color-rgb), 0.1);
            color: var(--secondary-text-color);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid transparent;
            display: flex;
            align-items: center;
            
            .tag-icon {
              margin-right: 4px;
              width: 14px;
              height: 14px;
              
              &.check {
                color: #4caf50;
              }
              
              &.error {
                color: #f44336;
              }
            }
            
            &:hover:not(.disabled) {
              background-color: rgba(var(--theme-color-rgb), 0.08);
              color: var(--text-color);
            }
            
            &.active {
              background-color: rgba(var(--theme-color-rgb), 0.1);
              color: var(--text-color);
              border-color: rgba(var(--theme-color-rgb), 0.2);
            }
            
            &.disabled {
              opacity: 0.5;
              cursor: default;
            }
          }
        }
      }
    }
    
    /* 周期折扣计算样式 */
    .discount-calculation {
      margin: 5px 0 15px 0;
      padding: 8px 12px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      border-radius: 8px;
      
      .discount-info {
        font-size: 14px;
        text-align: center;
        color: var(--text-color);
        
        .period-name {
          font-weight: 700;
          color: var(--theme-color);
        }
        
        .discount-label {
          font-weight: 500;
          
          /* 添加周期名称的主题色样式 */
          &::first-line,
          &:first-child {
            color: var(--theme-color);
            font-weight: 700;
          }
        }
        
        .discount-value {
          font-weight: 700;
          color: var(--theme-color);
        }
        
        .saving-text {
          font-weight: 400;
        }
        
        .saving-amount {
          font-weight: 700;
          color: var(--theme-color);
        }
      }
    }
    
    .plan-features {
      margin: 24px 0 10px 0;
      padding: 0 4px;
      
      .feature-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        
        .feature-icon {
          width: 20px;
          height: 20px;
          margin-right: 8px;
          
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
  
  /* 购买按钮样式 */
  .btn-purchase {
    position: relative;
    bottom: auto;
    left: auto;
    height: 40px;
    width: auto;
    min-width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0 16px;
    margin-top: 12px;
    align-self: flex-start;
    
    &.glassmorphism {
      background-color: rgba(var(--theme-color-rgb), 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(var(--theme-color-rgb), 0.3);
      box-shadow: 0 8px 20px rgba(var(--theme-color-rgb), 0.25);
    }
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(var(--theme-color-rgb), 0.35);
      background-color: rgba(var(--theme-color-rgb), 0.95);
    }
    
    &.btn-disabled {
      background-color: rgba(150, 150, 150, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: not-allowed;
      box-shadow: none;
      border: 1px solid rgba(150, 150, 150, 0.3);
      
      &:hover {
        transform: none;
        box-shadow: none;
      }
    }
    
    .btn-icon {
      width: 18px;
      height: 18px;
    }
  }
  
  /* Dark mode adjustments */
  .dark-theme {
    .skeleton-header,
    .skeleton-price,
    .skeleton-feature,
    .skeleton-button {
      background-color: rgba(255, 255, 255, 0.08);
      
      &::after {
        background: linear-gradient(90deg, 
          rgba(255, 255, 255, 0) 0%, 
          rgba(255, 255, 255, 0.05) 50%, 
          rgba(255, 255, 255, 0) 100%);
      }
    }
    
    .card-badge.glassmorphism {
      &.stock-plenty {
        background-color: rgba(76, 175, 80, 0.1);
      }
      
      &.stock-warning {
        background-color: rgba(255, 152, 0, 0.1);
      }
      
      &.stock-danger {
        background-color: rgba(244, 67, 54, 0.1);
      }
    }
  }
  
  /* 新的筛选器样式 */
  .filter-toggle-container {
    margin-bottom: 30px;
    display: flex;
    justify-content: center;
    
    .filter-toggle-wrapper {
      background: rgba(var(--card-background-rgb, 255, 255, 255), 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 18px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      padding: 8px 20px;
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 15px;
      max-width: 600px;
      will-change: backdrop-filter, background-color;
      transition: background-color 0.3s ease;
      
      .filter-option {
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 6px 10px;
        border-radius: 12px;
        
        &:hover {
          background-color: rgba(var(--theme-color-rgb), 0.05);
        }
        
        &.active {
          background-color: rgba(var(--theme-color-rgb), 0.08);
          .option-icon {
            color: var(--theme-color);
          }
          .option-text {
            color: var(--text-color);
            font-weight: 600;
          }
        }
        
        .option-icon {
          margin-right: 6px;
          display: flex;
          align-items: center;
          color: var(--secondary-text-color);
          transition: color 0.3s ease;
          
          svg {
            width: 18px;
            height: 18px;
          }
        }
        
        .option-text {
          font-size: 14px;
          color: var(--secondary-text-color);
          transition: color 0.3s ease;
        }

      }
    }
  }
  
  /* 没有套餐提示 */
  .no-plans-message {
    grid-column: 1 / -1;
    background-color: var(--card-bg-color);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    padding: 40px 20px;
    margin-bottom: 24px;
    border: 1px solid var(--border-color);
    text-align: center;
    
    .info-icon {
      color: var(--theme-color);
      opacity: 0.7;
      margin-bottom: 16px;
    }
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 10px;
      color: var(--text-color);
    }
    
    p {
      color: var(--secondary-text-color);
      margin-bottom: 24px;
    }
    
    .btn-reset-filter {
      padding: 8px 20px;
      background-color: var(--theme-color);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: var(--primary-color-hover);
        transform: translateY(-2px);
      }
    }
  }
  
  /* 添加套餐介绍卡片跑马灯效果 */
  .animate-card {
    position: relative;
    overflow: hidden;
    
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(
        to right,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.2) 50%,
        rgba(255, 255, 255, 0) 100%
      );
      animation: shimmer 3s infinite;
      transform: skewX(-25deg);
    }
  }
  
  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 200%;
    }
  }
}

/* 响应式处理 */
@media (max-width: 768px) {
  .shop-container {
    padding: 15px;
    padding-bottom: 80px;
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .plans-wrapper {
      grid-template-columns: 1fr;
    }
  }
  
  .shop-container .filter-toggle-container {
    .filter-toggle-wrapper {
      width: 100%;
      max-width: 100%;
      padding: 10px;
      flex-direction: row;
      justify-content: space-around;
      gap: 5px;
      border-radius: 14px;
      
      .filter-option {
        padding: 8px 10px;
        flex: 1;
        justify-content: center;
        min-width: 80px;
        
        .option-icon {
          margin-right: 4px;
          
          svg {
            width: 16px;
            height: 16px;
          }
        }
        
        .option-text {
          font-size: 12px;
          white-space: nowrap;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .shop-container .filter-toggle-container {
    .filter-toggle-wrapper {
      padding: 8px;
      
      .filter-option {
        padding: 6px 8px;
        min-width: auto;
        
        .option-icon {
          margin-right: 3px;
        }
      }
    }
  }
}
</style> 
