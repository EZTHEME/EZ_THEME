<template>
  <div class="api-validation-page">
    <div class="validation-container">
      <!-- 加载动画 -->
      <div class="loading-animation">
        <div class="progress-ring">
          <svg viewBox="0 0 100 100">
            <circle class="progress-ring-bg" cx="50" cy="50" r="45" />
            <circle 
              class="progress-ring-circle" 
              cx="50" 
              cy="50" 
              r="45"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="dashOffset"
            />
          </svg>
          <div class="progress-text">{{ progressPercent }}%</div>
        </div>
      </div>
      
      <!-- 状态信息 -->
      <div class="status-info">
        <h2 class="status-title">{{ $t('common.apiChecking') }}</h2>
        <p class="status-progress">
          {{ checkedCount }}/{{ totalApis }} {{ $t('common.completed') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { SITE_CONFIG } from '@/utils/baseConfig';
import { useTheme } from '@/composables/useTheme';

export default {
  name: 'ApiValidation',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const siteConfig = ref(SITE_CONFIG);
    const { theme } = useTheme();
    
    // 计算当前是否为深色模式
    const isDarkTheme = computed(() => theme.value === 'dark');
    
    // API检测状态
    const isChecking = ref(true);
    const checkedCount = ref(0);
    const totalApis = ref(0);
    const availableApiUrl = ref(null);
    
    // 计算圆环进度
    const circumference = 2 * Math.PI * 45;
    const dashOffset = computed(() => {
      if (totalApis.value === 0) return circumference;
      return circumference * (1 - checkedCount.value / totalApis.value);
    });
    
    // 计算百分比
    const progressPercent = computed(() => {
      if (totalApis.value === 0) return 0;
      return Math.round((checkedCount.value / totalApis.value) * 100);
    });
    
    // 获取重定向路径及查询参数
    const redirectInfo = computed(() => {
      // 获取基本重定向路径，如果没有则默认为首页
      // 确保仅使用纯路径部分，不包含查询参数
      let path = route.query.redirect || '/';
      if (path.includes('?')) {
        path = path.split('?')[0];
      }
      
      // 处理当前路由中的查询参数（除了redirect）
      const currentQuery = {...route.query};
      delete currentQuery.redirect;
      
      return {
        path,
        query: currentQuery
      };
    });
    
    // 检测API可用性
    const checkApiAvailability = async () => {
      // 获取配置
      if (typeof window === 'undefined' || !window.EZ_CONFIG) {
        navigateToTarget();
        return;
      }
      
      // 如果启用了中间件，不进行检测
      if (window.EZ_CONFIG.API_MIDDLEWARE_ENABLED === true) {
        navigateToTarget();
        return;
      }
      
      // 仅当urlMode为static且staticBaseUrl是长度大于1的数组时才检测
      const apiConfig = window.EZ_CONFIG.API_CONFIG;
      if (!apiConfig || apiConfig.urlMode !== 'static') {
        navigateToTarget();
        return;
      }
      
      // 检查staticBaseUrl是否为数组且长度大于1
      const staticBaseUrls = apiConfig.staticBaseUrl;
      if (!Array.isArray(staticBaseUrls) || staticBaseUrls.length <= 1) {
        navigateToTarget();
        return;
      }
      
      // 获取已存储的可用URL（如果有）
      const storedUrl = sessionStorage.getItem('ez_api_available_url');
      if (storedUrl) {
        console.log('使用已验证的API URL');
        availableApiUrl.value = storedUrl;
        navigateToTarget();
        return;
      }
      
      totalApis.value = staticBaseUrls.length;
      console.log('开始检测API可用性...');
      
      // 依次检测每个URL
      for (const url of staticBaseUrls) {
        try {
          console.log(`检测API节点 ${checkedCount.value + 1}/${totalApis.value}`);
          const isAvailable = await testApiEndpoint(url);
          checkedCount.value++;
          
          if (isAvailable) {
            console.log('找到可用的API节点');
            // 存储可用的URL
            sessionStorage.setItem('ez_api_available_url', url);
            availableApiUrl.value = url;
            
            // 覆盖window.EZ_CONFIG中的API_BASE_URL（如果存在）
            if (window.EZ_CONFIG) {
              window.EZ_CONFIG._AVAILABLE_API_URL = url;
            }
            
            // 找到可用API后先将进度设为100%
            checkedCount.value = totalApis.value;
            
            // 短暂延迟后跳转，让用户看到100%的进度
            setTimeout(() => {
              navigateToTarget();
            }, 500);
            return;
          }
        } catch (error) {
          console.log(`API节点 ${checkedCount.value + 1}/${totalApis.value} 不可用`);
          checkedCount.value++;
        }
      }
      
      console.warn('没有找到可用的API节点，将使用默认的第一个节点');
      // 如果没有可用的API，使用第一个作为默认值
      const defaultUrl = window.EZ_CONFIG.API_CONFIG.staticBaseUrl[0];
      console.log('使用默认API节点');
      // 存储默认URL作为可用URL
      sessionStorage.setItem('ez_api_available_url', defaultUrl);
      availableApiUrl.value = defaultUrl;
      
      // 确保进度为100%
      checkedCount.value = totalApis.value;
      
      // 短暂延迟后跳转，让用户看到100%的进度
      setTimeout(() => {
        navigateToTarget();
      }, 500);
    };
    
    // 测试特定API端点是否可用
    const testApiEndpoint = async (baseUrl) => {
      try {
        // 构建完整URL
        const url = `${baseUrl}/guest/comm/config`;
        
        // 设置超时时间
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
        
        // 发送请求
        const response = await fetch(url, { 
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        // 清除超时
        clearTimeout(timeoutId);
        
        // 检查响应状态
        if (!response.ok) {
          return false;
        }
        
        // 尝试解析响应
        const data = await response.json();
        return data && (data.data !== undefined || data.message !== undefined);
      } catch (error) {
        console.log(`测试API节点失败`);
        return false;
      }
    };
    
    // 跳转到目标路由
    const navigateToTarget = () => {
      isChecking.value = false;
      
      try {
        // 解析重定向路径中可能包含的查询参数
        let targetPath = redirectInfo.value.path;
        let targetQuery = {...redirectInfo.value.query};
        
        // 如果重定向路径包含查询参数 (例如: /path?param=value)
        if (targetPath.includes('?')) {
          const [pathPart, queryPart] = targetPath.split('?');
          targetPath = pathPart;
          
          // 解析查询字符串
          const searchParams = new URLSearchParams(queryPart);
          searchParams.forEach((value, key) => {
            targetQuery[key] = value;
          });
        }
        
        // 从 sessionStorage 获取原始查询参数（如果存在）
        const originalQueryParams = sessionStorage.getItem('ez_original_query_params');
        if (originalQueryParams) {
          try {
            const parsedParams = JSON.parse(originalQueryParams);
            // 将原始参数合并到目标查询参数中
            targetQuery = { ...targetQuery, ...parsedParams };
            // 清除存储的参数
            sessionStorage.removeItem('ez_original_query_params');
          } catch (e) {
            console.error('解析存储的查询参数失败:', e);
          }
        }
        
        // 使用路径和查询参数进行跳转
        router.replace({
          path: targetPath,
          query: targetQuery
        });
      } catch (error) {
        console.error('导航跳转错误:', error);
        // 降级处理：直接跳转到路径
        router.replace(redirectInfo.value.path);
      }
    };
    
    onMounted(() => {
      // 保存原始查询参数到 sessionStorage（不包括 redirect）
      const originalQuery = { ...route.query };
      delete originalQuery.redirect;
      if (Object.keys(originalQuery).length > 0) {
        sessionStorage.setItem('ez_original_query_params', JSON.stringify(originalQuery));
      }
      
      // 开始API检测
      checkApiAvailability();
    });
    
    return {
      siteConfig,
      isChecking,
      checkedCount,
      totalApis,
      availableApiUrl,
      circumference,
      dashOffset,
      progressPercent,
      isDarkTheme,
      redirectInfo
    };
  }
};
</script>

<style lang="scss" scoped>
.api-validation-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background-color, #f8f9fc);
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 30% 30%, rgba(var(--theme-color-rgb, 45, 85, 255), 0.05), transparent 30%),
                radial-gradient(circle at 70% 70%, rgba(var(--theme-color-rgb, 45, 85, 255), 0.03), transparent 40%);
    z-index: 0;
  }
}

.validation-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 320px;
  padding: 40px 20px;
  border-radius: 24px;
  background-color: rgba(30, 32, 35, 0.6);
  backdrop-filter: blur(10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2),
              0 5px 15px rgba(0, 0, 0, 0.1),
              inset 0 1px 1px rgba(255, 255, 255, 0.05);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  
  .loading-animation {
    margin: 10px 0;
    
    .progress-ring {
      position: relative;
      width: 140px;
      height: 140px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      
      svg {
        transform: rotate(-90deg);
        width: 100%;
        height: 100%;
      }
      
      .progress-ring-bg {
        fill: none;
        stroke: var(--border-color, rgba(0, 0, 0, 0.05));
        stroke-width: 4;
      }
      
      .progress-ring-circle {
        fill: none;
        stroke: var(--theme-color, #3d7eff);
        stroke-width: 4;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.5s ease;
        filter: drop-shadow(0 0 6px rgba(var(--theme-color-rgb, 61, 126, 255), 0.4));
      }
      
      .progress-text {
        position: absolute;
        font-size: 32px;
        font-weight: 600;
        color: var(--text-color, #333333);
        text-shadow: 0 0 10px rgba(var(--theme-color-rgb, 61, 126, 255), 0.2);
      }
    }
  }
  
  .status-info {
    text-align: center;
    
    .status-title {
      font-size: 18px;
      font-weight: 500;
      color: var(--text-color, #333333);
      margin-bottom: 10px;
    }
    
    .status-progress {
      font-size: 16px;
      font-weight: 400;
      color: var(--secondary-text-color, #666666);
    }
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .validation-container {
    max-width: 85%;
    padding: 30px 20px;
  }
}

/* 亮色模式适配 */
@media (prefers-color-scheme: light) {
  .api-validation-page {
    background-color: #f8f9fc;
    
    &::before {
      background: radial-gradient(circle at 30% 30%, rgba(45, 85, 255, 0.05), transparent 30%),
                  radial-gradient(circle at 70% 70%, rgba(45, 85, 255, 0.03), transparent 40%);
    }
  }
  
  .validation-container {
    background-color: var(--card-background, rgba(30, 32, 35, 0.6));
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2),
                0 5px 15px rgba(0, 0, 0, 0.1),
                inset 0 1px 1px rgba(255, 255, 255, 0.05);
    
    .progress-ring-bg {
      stroke: var(--border-color, rgba(255, 255, 255, 0.1));
    }
    
    .progress-text {
      color: var(--text-color, rgba(255, 255, 255, 0.95));
      text-shadow: 0 0 10px rgba(var(--theme-color-rgb, 61, 126, 255), 0.3);
    }
  }
}
</style> 