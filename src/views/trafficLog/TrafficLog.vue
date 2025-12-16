<template>
  <div class="trafficlog-container">
    <!-- 域名授权验证提示 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <div class="trafficlog-inner">
      <!-- 欢迎卡片 -->
      <div class="dashboard-card welcome-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('trafficLog.title') }}</h2>
        </div>
        <div class="card-body">
          <p>{{ $t('trafficLog.description') }}</p>
          
          <!-- 计算公式展示 -->
          <div class="formula-card">
            <div class="formula-title">{{ $t('trafficLog.formula') }}:</div>
            <div class="formula-content">{{ $t('trafficLog.formulaContent') }}</div>
          </div>
        </div>
      </div>
      
      <!-- 流量图表卡片 -->
      <div class="dashboard-card chart-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('trafficLog.trafficChart') }}</h2>
        </div>
        <div class="card-body">
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>{{ $t('trafficLog.loadingTraffic') }}</p>
          </div>
          
          <!-- 加载错误 -->
          <div v-else-if="error" class="error-container">
            <IconAlertCircle :size="48" class="error-icon" />
            <p>{{ $t('trafficLog.errorLoadingTraffic') }}</p>
          </div>
          
          <!-- 数据为空 -->
          <div v-else-if="!trafficData.length" class="empty-container">
            <IconFileOff :size="48" class="empty-icon" />
            <p>{{ $t('trafficLog.noTrafficData') }}</p>
          </div>
          
          <!-- 流量图表 -->
          <div v-else ref="chartRef" class="traffic-chart"></div>
        </div>
      </div>
      
      <!-- 流量数据列表 -->
      <div class="dashboard-card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('trafficLog.title') }}</h2>
        </div>
        <div class="card-body">
          <!-- 加载状态 -->
          <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>{{ $t('trafficLog.loadingTraffic') }}</p>
          </div>
          
          <!-- 加载错误 -->
          <div v-else-if="error" class="error-container">
            <IconAlertCircle :size="48" class="error-icon" />
            <p>{{ $t('trafficLog.errorLoadingTraffic') }}</p>
            <button class="retry-button" @click="fetchTrafficData">
              {{ $t('trafficLog.retry') }}
            </button>
          </div>
          
          <!-- 数据为空 -->
          <div v-else-if="!trafficData.length" class="empty-container">
            <IconFileOff :size="48" class="empty-icon" />
            <p>{{ $t('trafficLog.noTrafficData') }}</p>
          </div>
          
          <!-- 流量数据表格 -->
          <div v-else class="traffic-table-container">
            <table class="traffic-table">
              <thead>
                <tr>
                  <th>{{ $t('trafficLog.date') }}</th>
                  <th>{{ $t('trafficLog.uploadTraffic') }}</th>
                  <th>{{ $t('trafficLog.downloadTraffic') }}</th>
                  <th>{{ $t('trafficLog.totalTraffic') }}</th>
                  <th>{{ $t('trafficLog.serverRate') }}</th>
                  <th>{{ $t('trafficLog.deductedTraffic') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in trafficData" :key="index">
                  <td>{{ formatDate(item.record_at) }}</td>
                  <td>{{ formatTraffic(item.u) }}</td>
                  <td>{{ formatTraffic(item.d) }}</td>
                  <td>{{ formatTraffic(item.u + item.d) }}</td>
                  <td>{{ item.server_rate }}x</td>
                  <td>{{ formatTraffic((item.u + item.d) * parseFloat(item.server_rate)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconAlertCircle, IconFileOff } from '@tabler/icons-vue';
import { getTrafficLog } from '@/api/trafficLog';
import { formatTraffic, formatDate } from '@/utils/formatters';
import { TRAFFICLOG_CONFIG } from '@/utils/baseConfig';
import { applyDomainAuth } from '@/utils/licenseAuth';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import * as echarts from 'echarts';
import { createDebouncedUpdate } from '@/utils/componentLifecycle';

const { t } = useI18n();

// 授权状态验证
const authStatus = ref({
  isAuthorized: true,
  apiDomain: ''
});

// 流量数据
const trafficData = ref([]);
const loading = ref(true);
const error = ref(false);
const chartRef = ref(null);
let chartInstance = null;

// 获取流量数据
const fetchTrafficData = async () => {
  loading.value = true;
  error.value = false;
  
  try {
    const response = await getTrafficLog();
    if (response && response.data) {
      // 按时间排序，最新的在前面
      trafficData.value = response.data.sort((a, b) => b.record_at - a.record_at);
      
      // 按照配置限制天数
      if (TRAFFICLOG_CONFIG.daysToShow > 0) {
        // 获取不重复的日期
        const uniqueDates = [...new Set(trafficData.value.map(item => {
          const date = new Date(item.record_at * 1000);
          return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        }))];
        
        // 只保留指定天数的数据
        if (uniqueDates.length > TRAFFICLOG_CONFIG.daysToShow) {
          const datesToKeep = uniqueDates.slice(0, TRAFFICLOG_CONFIG.daysToShow);
          trafficData.value = trafficData.value.filter(item => {
            const date = new Date(item.record_at * 1000);
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            return datesToKeep.includes(dateStr);
          });
        }
      }
    } else {
      trafficData.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch traffic data:', err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

// 初始化图表
const initChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }
  
  if (!chartRef.value || trafficData.value.length === 0) return;
  
  // 初始化图表
  chartInstance = echarts.init(chartRef.value);
  
  // 获取实际计算后的主题色
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim() || '#355cc2';
  
  // 准备数据
  const dates = [];
  const uploadData = [];
  const downloadData = [];
  const totalData = [];
  
  // 从数据中选取最多30个数据点，并反转顺序使最新的日期在右侧
  const sortedData = [...trafficData.value].slice(0, 30).reverse();
  
  sortedData.forEach(item => {
    dates.push(formatDate(item.record_at));
    // 转换为GB并保留2位小数
    const upload = parseFloat((item.u / (1024 * 1024 * 1024)).toFixed(2));
    const download = parseFloat((item.d / (1024 * 1024 * 1024)).toFixed(2));
    uploadData.push(upload);
    downloadData.push(download);
    totalData.push(parseFloat((upload + download).toFixed(2)));
  });
  
  // 设置图表选项
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        let result = params[0].name + '<br/>';
        params.forEach(param => {
          let value = param.value + ' GB';
          result += param.marker + ' ' + param.seriesName + ': ' + value + '<br/>';
        });
        return result;
      }
    },
    legend: {
      data: [t('trafficLog.uploadTraffic'), t('trafficLog.downloadTraffic'), t('trafficLog.totalTraffic')],
      bottom: 0,
      textStyle: {
        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#333333'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '60px',
      top: '30px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        interval: 'auto',
        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#333333'
      },
      axisLine: {
        lineStyle: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e8e8e8'
        }
      },
      splitLine: {
        lineStyle: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e8e8e8'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'GB',
      nameTextStyle: {
        padding: [0, 0, 0, 10],
        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#333333'
      },
      axisLabel: {
        formatter: '{value} GB',
        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#333333'
      },
      axisLine: {
        lineStyle: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e8e8e8'
        }
      },
      splitLine: {
        lineStyle: {
          color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e8e8e8'
        }
      }
    },
    series: [
      {
        name: t('trafficLog.uploadTraffic'),
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          width: 2
        },
        showSymbol: false,
        areaStyle: {
          opacity: 0.2
        },
        emphasis: {
          focus: 'series'
        },
        data: uploadData,
        color: '#36AD47' // 深绿色
      },
      {
        name: t('trafficLog.downloadTraffic'),
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          width: 2
        },
        showSymbol: false,
        areaStyle: {
          opacity: 0.2
        },
        emphasis: {
          focus: 'series'
        },
        data: downloadData,
        color: '#4080FF' // 靛蓝色
      },
      {
        name: t('trafficLog.totalTraffic'),
        type: 'line',
        smooth: true,
        lineStyle: {
          width: 3
        },
        showSymbol: false,
        emphasis: {
          focus: 'series'
        },
        data: totalData,
        color: themeColor // 使用获取到的实际主题色
      }
    ]
  };
  
  // 渲染图表
  chartInstance.setOption(option);
  
  // 响应窗口大小调整
  window.addEventListener('resize', handleResize);
};

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

// 使用防抖处理窗口大小改变事件
const debouncedResize = createDebouncedUpdate(handleResize, 200);

// 监视数据变化，更新图表
watch(trafficData, () => {
  if (!loading.value && !error.value && trafficData.value.length > 0) {
    nextTick(() => {
      initChart();
    });
  }
}, { deep: true });

// 添加一个变量来存储MutationObserver实例
let themeObserver = null;

// 设置一个监听主题变化的函数
const setupThemeObserver = () => {
  // 如果已经有观察者，先断开连接
  if (themeObserver) {
    themeObserver.disconnect();
  }
  
  // 创建一个新的观察者，使用防抖处理提高性能
  let debounceTimer = null;
  themeObserver = new MutationObserver(() => {
    // 防抖处理，避免短时间内多次调用
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // 当属性变化时，重新初始化图表
      nextTick(() => {
        if (chartInstance && chartRef.value) {
          initChart();
        }
      });
    }, 300); // 300ms防抖时间
  });
  
  // 开始观察document.documentElement的属性变化，特别是类的变化（通常用于切换主题）
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'] // 只关注类和样式变化
  });
};

// 页面挂载时获取数据
onMounted(() => {
  // 应用授权验证
  authStatus.value = applyDomainAuth();
  fetchTrafficData();
  setupThemeObserver();
  
  // 使用防抖处理的resize事件监听器
  window.addEventListener('resize', debouncedResize);
});

// 页面卸载时清理资源
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener('resize', debouncedResize);
  
  // 断开观察者连接
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
});

// 当数据加载完成后，初始化图表
watch(loading, (newVal) => {
  if (!newVal && !error.value && trafficData.value.length > 0) {
    nextTick(() => {
      initChart();
    });
  }
});
</script>

<style lang="scss" scoped>
.trafficlog-container {
  padding: 20px;
  padding-bottom: 80px; /* 增加底部内边距，避免被底部菜单遮挡 */
  display: flex;
  justify-content: center;
  
  .trafficlog-inner {
    width: 100%;
    max-width: 1200px;
  }
  
  .welcome-card {
    margin-bottom: 24px;
  }
  
  .chart-card {
    margin-bottom: 24px;
    
    .traffic-chart {
      height: 400px;
      width: 100%;
      
      @media (max-width: 768px) {
        height: 300px;
      }
    }
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
  
  .formula-card {
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border-radius: 8px;
    padding: 12px 16px;
    margin-top: 16px;
    
    .formula-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .formula-content {
      font-family: inherit;
      padding: 8px;
      background-color: rgba(0, 0, 0, 0.03);
      border-radius: 4px;
    }
  }
  
  .loading-container, .error-container, .empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    
    p {
      margin-top: 16px;
      color: var(--secondary-text-color);
    }
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(var(--theme-color-rgb), 0.1);
    border-left-color: var(--theme-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }
  
  .error-icon, .empty-icon {
    color: var(--secondary-text-color);
    opacity: 0.7;
  }
  
  .retry-button {
    margin-top: 16px;
    padding: 8px 16px;
    background-color: var(--theme-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.8);
    }
  }
  
  .traffic-table-container {
    overflow-x: auto;
    margin-top: 12px;
    -webkit-overflow-scrolling: touch; /* 增强iOS滑动体验 */
    
    .traffic-table {
      width: 100%;
      min-width: 650px; /* 确保表格在小屏幕上有一个最小宽度，强制显示滚动条 */
      border-collapse: collapse;
      
      th, td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
        white-space: nowrap; /* 防止内容换行 */
      }
      
      th {
        font-weight: 600;
        color: var(--secondary-text-color);
        background-color: rgba(0, 0, 0, 0.02);
      }
      
      tr:last-child td {
        border-bottom: none;
      }
      
      tr:hover td {
        background-color: rgba(var(--theme-color-rgb), 0.05);
      }
      
      @media (max-width: 768px) {
        th, td {
          padding: 8px 6px;
          font-size: 0.85em;
        }
      }
    }
  }
}
</style> 