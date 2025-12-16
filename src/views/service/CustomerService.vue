<template>
  <div 
    class="customer-service-container"
    :class="{ 'dark-theme': isDarkTheme }"
  >
    <!-- 顶部导航栏 -->
    <div class="service-header">
      <button class="back-button" @click="goBack">
        <IconArrowLeft :size="24" />
      </button>
      <h1 class="service-title">{{ t('service.title') }}</h1>
      
      <!-- 添加一个刷新按钮 -->
      <button class="refresh-button" @click="refreshChat">
        <IconRefresh :size="20" />
      </button>
    </div>

    <!-- 客服系统容器 -->
    <div class="service-content">
      <!-- Crisp客服系统会自动注入到页面中 -->
      <div v-if="serviceType === 'crisp'" class="service-crisp-container">
        <!-- 加载中提示，当聊天窗口加载时显示 -->
        <div v-if="loading" class="service-loading">
          <div class="loading-spinner"></div>
          <p>{{ t('service.loading') }}</p>
        </div>
      </div>
      
      <!-- 其他客服系统直接渲染HTML -->
      <div v-else-if="serviceType === 'other'" class="service-other-container">
        <!-- 提示用户等待 -->
        <div class="other-service-tips">{{ t('service.waitForIcon') }}</div>
        <!-- 客服系统容器 -->
        <div id="other-service-wrapper" ref="otherServiceContainer"></div>
      </div>
      
      <!-- 加载中提示 -->
      <div v-else class="service-loading">
        <div class="loading-spinner"></div>
        <p>{{ t('service.loading') }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { CUSTOMER_SERVICE_CONFIG } from '@/utils/baseConfig';
import { getUserInfo, getCommConfig, getUserSubscribe } from '@/api/user';
import { formatDate } from '@/utils/formatters';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-vue';
import { Crisp } from 'crisp-sdk-web';

// 全局变量跟踪Crisp是否已在全局范围内初始化过
if (typeof window !== 'undefined') {
  window.CRISP_INITIALIZED = window.CRISP_INITIALIZED || false;
}

export default {
  name: 'CustomerService',
  components: {
    IconArrowLeft,
    IconRefresh
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const { t } = useI18n();
    const userInfo = ref(null);
    const loading = ref(true);
    const otherServiceContainer = ref(null);
    const crispInitialized = ref(window.CRISP_INITIALIZED || false);
    const currencySymbol = ref('¥'); // 默认货币符号
    const userSubscribe = ref(null);  // 存储用户订阅信息

    // 安全获取客服系统类型
    const serviceType = computed(() => {
      return CUSTOMER_SERVICE_CONFIG?.type || 'crisp'; // 默认为crisp
    });

    // 初始化Crisp客服系统
    const initCrisp = () => {
      if (serviceType.value !== 'crisp') return;
      
      // 如果Crisp已经初始化过，直接显示它
      if (window.CRISP_INITIALIZED) {
        try {
          Crisp.chat.show(); // 显示聊天窗口
          Crisp.chat.open(); // 打开聊天窗口
          loading.value = false;
          crispInitialized.value = true;
          return;
        } catch (error) {
          console.error('显示已初始化的Crisp失败:', error);
          // 出错时，尝试重新初始化
        }
      }
      
      try {
        // 从配置中提取Crisp ID
        const crispIdMatch = CUSTOMER_SERVICE_CONFIG?.customHtml?.match(/CRISP_WEBSITE_ID="([^"]*)"/);
        const websiteId = crispIdMatch ? crispIdMatch[1] : '';
        
        if (!websiteId) {
          console.error('无法从配置中提取Crisp ID');
          loading.value = false;
          return;
        }

        // 配置Crisp - 自动加载
        Crisp.configure(websiteId);
        
        // 设置主题
        const storedTheme = localStorage.getItem('theme');
        const currentTheme = storedTheme || store.getters.currentTheme || 'light';
        const isCurrentDarkTheme = currentTheme === 'dark';
        
        if (isCurrentDarkTheme) {
          Crisp.setColorTheme('dark');
        }

        // 设置用户数据
        if (store.getters.isLoggedIn) {
          // 获取用户邮箱
          let userEmail = '';
          
          // 首先尝试从用户基本信息获取邮箱
          if (userInfo.value) {
            if (typeof userInfo.value === 'object') {
              if (userInfo.value.email) {
                userEmail = userInfo.value.email;
                // console.log('从userInfo中获取到邮箱:', userEmail);
              } else if (userInfo.value.data && userInfo.value.data.email) {
                userEmail = userInfo.value.data.email;
                // console.log('从userInfo.data中获取到邮箱:', userEmail);
              }
            }
          }
          
          // 如果仍未获取到邮箱，尝试从订阅信息获取
          if (!userEmail && userSubscribe.value) {
            if (typeof userSubscribe.value === 'object') {
              if (userSubscribe.value.email) {
                userEmail = userSubscribe.value.email;
                // console.log('从userSubscribe中获取到邮箱:', userEmail);
              } else if (userSubscribe.value.data && userSubscribe.value.data.email) {
                userEmail = userSubscribe.value.data.email;
                // console.log('从userSubscribe.data中获取到邮箱:', userEmail);
              }
            }
          }
          
          // 从存储中尝试获取
          if (!userEmail) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.email) {
                  userEmail = parsedUser.email;
                  // console.log('从localStorage中获取到邮箱:', userEmail);
                }
              } catch (e) {
                console.error('解析localStorage用户数据失败:', e);
              }
            }
          }
          
          // 设置用户邮箱和昵称
          if (userEmail) {
            Crisp.user.setEmail(userEmail);
            const nickname = userEmail.split('@')[0];
            Crisp.user.setNickname(nickname);
            // console.log('设置用户邮箱和昵称成功:', userEmail, nickname);
          } else {
            console.warn('无法获取用户邮箱，跳过设置邮箱和昵称');
          }

          // 设置其他用户数据
          // 1. 获取套餐名称
          let planName = "未知套餐";
          if (userSubscribe.value && userSubscribe.value.plan && userSubscribe.value.plan.name) {
            // 首选从订阅信息中获取套餐名称
            planName = userSubscribe.value.plan.name;
          } else if (userSubscribe.value && userSubscribe.value.data && userSubscribe.value.data.plan && userSubscribe.value.data.plan.name) {
            planName = userSubscribe.value.data.plan.name;
          } else if (userInfo.value && userInfo.value.plan_name && userInfo.value.plan_name.trim() !== '') {
            // 从用户信息中获取套餐名称
            planName = userInfo.value.plan_name;
          } else if (userInfo.value && userInfo.value.group && userInfo.value.group.name && userInfo.value.group.name.trim() !== '') {
            // 尝试从group名称中获取
            planName = userInfo.value.group.name;
          }
          
          // 2. 获取到期时间
          let expireDate = "无限期";
          if (userSubscribe.value && userSubscribe.value.expired_at) {
            // 首选从订阅信息中获取到期时间
            expireDate = formatDate(userSubscribe.value.expired_at);
          } else if (userSubscribe.value && userSubscribe.value.data && userSubscribe.value.data.expired_at) {
            expireDate = formatDate(userSubscribe.value.data.expired_at);
          } else if (userInfo.value && userInfo.value.expired_at) {
            // 从用户信息中获取到期时间
            expireDate = formatDate(userInfo.value.expired_at);
          } else if (userInfo.value && userInfo.value.data && userInfo.value.data.expired_at) {
            expireDate = formatDate(userInfo.value.data.expired_at);
          }
          
          // 3. 计算剩余流量（GB）
          let transferEnable = 0;
          let u = 0;
          let d = 0;
          
          if (userSubscribe.value) {
            if (typeof userSubscribe.value === 'object') {
              // 首选从订阅信息中获取流量数据
              if (userSubscribe.value.transfer_enable !== undefined) {
                transferEnable = userSubscribe.value.transfer_enable || 0;
                u = userSubscribe.value.u || 0;
                d = userSubscribe.value.d || 0;
              } else if (userSubscribe.value.data && userSubscribe.value.data.transfer_enable !== undefined) {
                transferEnable = userSubscribe.value.data.transfer_enable || 0;
                u = userSubscribe.value.data.u || 0;
                d = userSubscribe.value.data.d || 0;
              }
            }
          } 
          
          if (transferEnable === 0 && userInfo.value) {
            if (typeof userInfo.value === 'object') {
              // 从用户信息中获取流量数据
              if (userInfo.value.transfer_enable !== undefined) {
                transferEnable = userInfo.value.transfer_enable || 0;
                u = userInfo.value.u || 0;
                d = userInfo.value.d || 0;
              } else if (userInfo.value.data && userInfo.value.data.transfer_enable !== undefined) {
                transferEnable = userInfo.value.data.transfer_enable || 0;
                u = userInfo.value.data.u || 0;
                d = userInfo.value.data.d || 0;
              }
            }
          }
          
          const remainingBytes = transferEnable - (u + d);
          
          // 将字节转换为GB
          const remainingGB = (remainingBytes / (1024 * 1024 * 1024)).toFixed(2);
          
          // 4. 获取用户余额并添加货币符号
          let balance = 0;
          
          if (userInfo.value) {
            if (typeof userInfo.value === 'object') {
              if (userInfo.value.balance !== undefined) {
                balance = userInfo.value.balance || 0;
              } else if (userInfo.value.data && userInfo.value.data.balance !== undefined) {
                balance = userInfo.value.data.balance || 0;
              }
            }
          }
          
          // 设置会话数据
          const sessionData = {
            Email: userEmail,
            Plan: planName,
            Expires: expireDate,
            Traffic: remainingGB + ' GB',
            Balance: balance + ' ' + currencySymbol.value
          };
          
          // console.log('设置Crisp会话数据:', sessionData);
          Crisp.session.setData(sessionData);
          // console.log('成功设置用户数据');
        }

        // 在Crisp初始化完成后，标记加载完成
        Crisp.session.onLoaded(() => {
          loading.value = false;
          window.CRISP_INITIALIZED = true;
          crispInitialized.value = true;
          // console.log('Crisp聊天窗口已加载完成');
        });
        
        // console.log('Crisp SDK已初始化');
      } catch (error) {
        console.error('初始化Crisp客服系统失败:', error);
        loading.value = false;
      }
    };
    
    // 清除其他客服系统
    const clearOtherService = () => {
      // 找到并移除所有与客服系统相关的脚本
      const scripts = document.querySelectorAll('script[id^="zoho"], script[id*="chat"], script[id*="support"], script[id*="customer"]');
      scripts.forEach(script => {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
      
      // 清空容器内容
      if (otherServiceContainer.value) {
        otherServiceContainer.value.innerHTML = '';
      }
      
      // 清除可能存在的全局变量和对象
      if (window.ZohoDeskAsap) {
        window.ZohoDeskAsap = undefined;
      }
      
      // 找到并移除客服系统可能创建的DOM元素
      const possibleElements = document.querySelectorAll('[id*="chat"], [id*="support"], [id*="crisp"], [id*="zoho"], [id*="custom-chat"]');
      possibleElements.forEach(el => {
        if (el && el.id !== 'other-service-wrapper' && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };
    
    // 加载其他客服系统
    const loadOtherService = () => {
      if (!CUSTOMER_SERVICE_CONFIG?.customHtml) return;
      
      // 先清除之前的客服系统
      clearOtherService();
      
      // 获取容器
      const container = document.getElementById('other-service-wrapper');
      if (!container) return;
      
      // 创建一个div来存放客服HTML
      const div = document.createElement('div');
      div.className = 'custom-chat-container';
      
      // 插入HTML到页面中
      document.body.appendChild(div);
      
      try {
        // 创建script元素并添加代码
        const scriptContent = CUSTOMER_SERVICE_CONFIG.customHtml;
        const scriptElement = document.createElement('script');
        
        // 复制script标签的属性
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scriptContent;
        const originalScript = tempDiv.querySelector('script');
        
        if (originalScript) {
          // 复制原始脚本的所有属性
          Array.from(originalScript.attributes).forEach(attr => {
            scriptElement.setAttribute(attr.name, attr.value);
          });
          
          // 设置脚本内容
          scriptElement.textContent = originalScript.textContent || '';
          
          // 将脚本添加到文档中
          document.body.appendChild(scriptElement);
        } else {
          // 如果没有找到script标签，直接将整个内容作为脚本添加
          scriptElement.textContent = scriptContent;
          document.body.appendChild(scriptElement);
        }
        
        loading.value = false;
      } catch (error) {
        console.error('加载客服系统脚本失败:', error);
        loading.value = false;
      }
    };
    
    // 获取当前主题 - 使用computed确保实时更新
    const isDarkTheme = computed(() => {
      // 从localStorage直接读取主题值
      const storedTheme = localStorage.getItem('theme');
      return storedTheme === 'dark';
    });
    
    // 刷新聊天窗口
    const refreshChat = () => {
      if (serviceType.value === 'crisp') {
        // 重置Crisp会话
        loading.value = true;
        Crisp.session.reset();
        window.CRISP_INITIALIZED = false;
        crispInitialized.value = false;
        
        // 重新初始化Crisp
        nextTick(() => {
          initCrisp();
        });
      } else {
        // 如果是other类型，直接刷新整个页面
        window.location.reload();
      }
    };
    
    // 监听主题变化，更新主题
    watch(() => isDarkTheme.value, (newVal) => {
      if (serviceType.value === 'crisp' && crispInitialized.value) {
        Crisp.setColorTheme(newVal ? 'dark' : 'light');
      }
    });
    
    // 获取用户信息并准备传递给客服系统
    const fetchUserInfo = async () => {
      // 如果用户未登录或者客服类型不是crisp，则不获取用户数据
      if (!store.getters.isLoggedIn || serviceType.value !== 'crisp') return;
      
      try {
        // 并行请求所有API
        const [userInfoResponse, commConfigResponse, subscribeResponse] = await Promise.all([
          getUserInfo(),
          getCommConfig(),
          getUserSubscribe()
        ]);
        
        // 处理用户基本信息
        userInfo.value = userInfoResponse.data ? userInfoResponse.data : userInfoResponse;
        // console.log('获取到用户信息结构:', JSON.stringify(userInfo.value, null, 2).substring(0, 500) + '...');
        
        // 处理货币符号
        const commConfigData = commConfigResponse.data ? commConfigResponse.data : commConfigResponse;
        // console.log('通信配置数据结构:', JSON.stringify(commConfigData, null, 2).substring(0, 500) + '...');
        
        if (commConfigData && commConfigData.currency_symbol) {
          currencySymbol.value = commConfigData.currency_symbol;
          // console.log('获取到货币符号:', currencySymbol.value);
        }
        
        // 处理用户订阅信息
        userSubscribe.value = subscribeResponse.data ? subscribeResponse.data : subscribeResponse;
        // console.log('订阅信息数据结构:', JSON.stringify(userSubscribe.value, null, 2).substring(0, 500) + '...');
        
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };
    
    // 返回上一页
    const goBack = () => {
      // 如果是Crisp，则隐藏聊天窗口而不是重置会话
      if (serviceType.value === 'crisp' && crispInitialized.value) {
        try {
          Crisp.chat.hide(); // 隐藏聊天窗口，但不重置会话
          // Crisp.session.reset() 被删除，以保持会话状态
        } catch (error) {
          console.error('隐藏Crisp失败:', error);
        }
      } else {
        // 清除其他客服系统
        clearOtherService();
      }
      
      router.back();
    };
    
    onMounted(async () => {
      // 获取用户信息
      await fetchUserInfo();
      
      // 如果是other类型的客服系统，重新加载页面以确保脚本能正确执行
      if (serviceType.value === 'other') {
        // 检查是否是从当前页面刷新过来的，避免无限刷新
        const hasReloaded = sessionStorage.getItem('cs_page_reloaded');
        if (!hasReloaded) {
          // 标记已经刷新过
          sessionStorage.setItem('cs_page_reloaded', 'true');
          // 重新加载页面
          window.location.reload();
          return;
        }
      } else {
        // 如果不是other类型，清除刷新标记
        sessionStorage.removeItem('cs_page_reloaded');
      }
      
      if (serviceType.value === 'crisp') {
        // 初始化Crisp
        initCrisp();
      } else {
        // 加载其他客服系统
        loadOtherService();
      }
      
      // 监听存储变化（用于处理其他标签页的主题变化）
      window.addEventListener('storage', (e) => {
        if (e.key === 'theme' && serviceType.value === 'crisp' && crispInitialized.value) {
          const newTheme = e.newValue;
          Crisp.setColorTheme(newTheme === 'dark' ? 'dark' : 'light');
        }
      });
    });
    
    onUnmounted(() => {
      // 移除事件监听器
      window.removeEventListener('storage', () => {});
      
      // 离开页面时清除刷新标记
      sessionStorage.removeItem('cs_page_reloaded');
      
      // 如果是Crisp，只隐藏聊天窗口而不重置会话
      if (serviceType.value === 'crisp' && crispInitialized.value) {
        try {
          Crisp.chat.hide(); // 隐藏聊天窗口
          // Crisp.session.reset() 被删除，以保持会话状态
        } catch (error) {
          console.error('隐藏Crisp失败:', error);
        }
      } else {
        // 清除其他客服系统
        clearOtherService();
      }
    });
    
    return {
      isDarkTheme,
      otherServiceContainer,
      refreshChat,
      goBack,
      serviceType,
      loading,
      t
    };
  }
};
</script>

<style lang="scss" scoped>
.customer-service-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background-color: var(--background-color);
  color: var(--text-color);
  
  &.dark-theme {
    --background-color: #171A1D;
    --card-background: rgba(30, 30, 30, 0.8);
    --text-color: rgba(255, 255, 255, 0.9);
    --secondary-text-color: rgba(255, 255, 255, 0.6);
    --border-color: rgba(255, 255, 255, 0.1);
  }
  
  &:not(.dark-theme) {
    --background-color: #f5f7fa;
    --card-background: #ffffff;
    --text-color: #333333;
    --secondary-text-color: #666666;
    --border-color: #e8e8e8;
  }
}

.service-header {
  display: flex;
  align-items: center;
  padding: 20px;
  position: relative;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background-color: var(--card-background);
}

.back-button, .refresh-button {
  background: none;
  border: none;
  color: var(--theme-color);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button {
  margin-left: auto; /* 将刷新按钮推到右边 */
}

.service-title {
  margin: 0 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  flex-grow: 1; /* 让标题占据中间空间 */
}

.service-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: calc(100vh - 70px);
}

.service-crisp-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.service-other-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  
  .other-service-tips {
    padding: 16px;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 16px;
    margin-top: 40px;
  }
}

.service-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--theme-color);
    border-top: 3px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  p {
    color: var(--text-color);
    font-size: 16px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 移动设备样式调整 */
@media (max-width: 768px) {
  .service-header {
    padding: 16px;
  }
  
  .service-title {
    font-size: 16px;
  }
  
  .service-content {
    height: calc(100vh - 60px);
  }
}
</style> 