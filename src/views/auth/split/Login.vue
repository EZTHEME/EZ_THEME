<template>
  <div class="login-view-container">
    <div class="auth-split-container">
      <!-- 域名授权验证提示 -->
      <DomainAuthAlert 
        :is-authorized="authStatus.isAuthorized" 
        :api-domain="authStatus.apiDomain" 
      />
      
      <!-- 左侧背景区域 -->
      <div class="auth-split-left" :style="leftSideStyles">
        <div class="left-content-overlay"></div>
        <div class="site-name" v-if="showSiteName" :class="siteNameColorClass">
          {{ SITE_CONFIG.siteName }}
        </div>
        <div class="greeting-text" v-if="showGreeting" :class="greetingColorClass">
          {{ greetingMessage }}
        </div>
      </div>
      
      <!-- 右侧表单区域 -->
      <div class="auth-split-right">
        <!-- 顶部工具栏：语言选择器和主题切换 -->
        <div class="top-toolbar">
          <ThemeToggle />
          <LanguageSelector />
        </div>
        
        <div class="auth-form-container" v-if="configLoading">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>{{ $t('common.loading') }}</p>
          </div>
        </div>
        
        <div class="auth-form-container" v-else>
          <div class="auth-header">
            <div class="auth-logo">
              <img 
                :src="logoPath" 
                alt="Logo" 
                @error="handleLogoError" 
              />
            </div>
            <h1 class="auth-title">{{ $t('auth.loginTitle') }}</h1>
            <p class="auth-subtitle">{{ $t('auth.loginSubtitle') }}</p>
          </div>
          
          <form class="auth-form" @submit.prevent="handleLogin">
            <div class="form-group">
              <label for="email">{{ $t('common.email') }} <span class="required">*</span></label>
              <div class="input-with-icon">
                <IconMail class="input-icon" />
                <input
                  type="email"
                  id="email"
                  v-model="formData.email"
                  class="form-control"
                  :placeholder="$t('auth.emailPlaceholder')"
                  required
                />
              </div>
              <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
            </div>
            
            <div class="form-group">
              <label for="password">{{ $t('common.password') }} <span class="required">*</span></label>
              <div class="input-with-icon">
                <IconLock class="input-icon" />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  id="password"
                  v-model="formData.password"
                  class="form-control"
                  :placeholder="$t('auth.passwordPlaceholder')"
                  required
                />
                <div class="password-toggle" @click="showPassword = !showPassword">
                  <IconEye v-if="!showPassword" />
                  <IconEyeOff v-else />
                </div>
              </div>
              <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
            </div>
            
            <div class="form-options">
              <div class="remember-me">
                <label class="checkbox-container">
                  <input type="checkbox" v-model="formData.rememberMe" />
                  <span class="checkmark"></span>
                  <span class="checkbox-label">{{ $t('common.rememberMe') }}</span>
                </label>
              </div>
              <router-link to="/forgot-password" class="forgot-password">
                {{ $t('common.forgotPassword') }}
              </router-link>
            </div>
            
            <button
              type="submit"
              class="btn btn-primary btn-block"
              :disabled="loading"
            >
              <span v-if="loading" class="loading-wrapper">
                <span>{{ $t('common.loading') }}</span>
              </span>
              <span v-else>
                {{ $t('common.login') }}
                <IconArrowRight class="icon-right" />
              </span>
            </button>
          </form>
          
          <div class="auth-footer">
            <div class="auth-divider">
              <span class="auth-divider-text">{{ $t('auth.noAccount') }}</span>
            </div>
            
            <router-link to="/register" class="btn btn-secondary btn-block" replace>
              {{ $t('auth.createAccount') }}
            </router-link>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 验证码弹窗 -->
    <div class="captcha-modal" v-if="showCaptchaModal" :class="{ 'closing': isClosingModal }">
      <!-- 现有弹窗内容保持不变 -->
    </div>
    
    <!-- 自定义弹窗 -->
    <AuthPopup
      :show-popup="showAuthPopup"
      :title="authPopupConfig.title"
      :content="authPopupConfig.content"
      :cooldown-hours="authPopupConfig.cooldownHours"
      :close-wait-seconds="authPopupConfig.closeWaitSeconds"
      @close="handleAuthPopupClose"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSelector from '@/components/common/LanguageSelector.vue';
import IconMail from '@/components/icons/IconMail.vue';
import IconLock from '@/components/icons/IconLock.vue';
import IconArrowRight from '@/components/icons/IconArrowRight.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconEyeOff from '@/components/icons/IconEyeOff.vue';
import { login, checkLoginStatus } from '@/api/auth';
import { validateEmail, validateRequired } from '@/utils/validators';
import { applyDomainAuth } from '@/utils/licenseAuth';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
// 引入令牌验证登录功能
import { handleTokenLogin, hasVerifyToken } from '@/utils/tokenLogin';
// 引入布局配置
import { AUTH_LAYOUT_CONFIG, SITE_CONFIG, AUTH_CONFIG } from '@/utils/baseConfig';
// 引入自定义弹窗组件
import AuthPopup from '@/components/auth/AuthPopup.vue';
// 引入弹窗状态管理
import { shouldShowAuthPopup } from '@/utils/authPopupState';

export default {
  name: 'LoginView',
  components: {
    ThemeToggle,
    LanguageSelector,
    IconMail,
    IconLock,
    IconArrowRight,
    IconEye,
    IconEyeOff,
    DomainAuthAlert,
    AuthPopup
  },
  
  setup() {
    const router = useRouter();
    const { t } = useI18n();
    const { showToast } = useToast();
    
    // logo路径处理
    const logoPath = ref('./images/logo.png');
    const handleLogoError = () => {
      logoPath.value = '/images/logo.png';
    };
    
    // 表单数据
    const formData = reactive({
      email: '',
      password: '',
      rememberMe: false
    });
    
    // 错误信息
    const errors = reactive({
      email: '',
      password: ''
    });
    
    // 加载状态
    const loading = ref(false);
    const configLoading = ref(false);
    
    // 验证码弹窗相关
    const showCaptchaModal = ref(false);
    const isClosingModal = ref(false);
    
    // 自定义弹窗相关
    const showAuthPopup = ref(false);
    const authPopupConfig = reactive({
      title: AUTH_CONFIG.popup?.title || '',
      content: AUTH_CONFIG.popup?.content || '',
      cooldownHours: AUTH_CONFIG.popup?.cooldownHours || 24,
      closeWaitSeconds: AUTH_CONFIG.popup?.closeWaitSeconds || 0
    });
    
    // 处理弹窗关闭事件
    const handleAuthPopupClose = () => {
      showAuthPopup.value = false;
    };
    
    // 密码可见性
    const showPassword = ref(false);
    
    // 授权状态
    const authStatus = ref({
      isAuthorized: true,
      apiDomain: ''
    });
    
    // 网站名称显示控制
    const showSiteName = computed(() => {
      return AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.siteName?.show !== false;
    });
    
    // 网站名称颜色类
    const siteNameColorClass = computed(() => {
      const color = AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.siteName?.color || 'white';
      return color.toLowerCase() === 'black' ? 'black' : 'white';
    });
    
    // 左侧样式
    const leftSideStyles = computed(() => {
      const backgroundImage = AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.backgroundImage || '';
      
      if (backgroundImage) {
        return {
          'background-image': `url(${backgroundImage})`,
          'background-position': 'center',
          'background-size': 'cover',
          'background-repeat': 'no-repeat'
        };
      } else {
        return { background: 'var(--theme-color)' };
      }
    });
    
    // 问候语相关
    const showGreeting = computed(() => {
      return AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.greeting?.show !== false;
    });
    
    const greetingMessage = computed(() => {
      return getTimeBasedGreeting();
    });
    
    const greetingColorClass = computed(() => {
      const color = AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.greeting?.color || 'white';
      return color.toLowerCase() === 'black' ? 'black' : 'white';
    });
    
    // 检查登录状态
    onMounted(async () => {
      // 应用授权验证
      authStatus.value = applyDomainAuth();
      
      // 处理令牌验证登录 - 增加更多调试信息
      // console.log('检查是否有验证令牌...');
      const hasToken = hasVerifyToken();
      // console.log('hasVerifyToken返回结果:', hasToken);
      
      if (hasToken) {
        // console.log('检测到验证令牌，尝试自动登录');
        // 显示加载状态
        loading.value = true;
        
        try {
          // 使用令牌登录，如果成功，后续逻辑将不执行
          const tokenLoginResult = await handleTokenLogin({
            onLoginSuccess: () => {
              console.log('令牌验证登录成功');
            }
          });
          
          // console.log('令牌登录结果:', tokenLoginResult);
          
          // 如果成功验证令牌并登录，则不继续执行后续逻辑
          if (tokenLoginResult.success) {
            return;
          }
        } catch (error) {
          console.error('令牌登录过程中出错:', error);
        } finally {
          loading.value = false;
        }
      }
      
      // 从URL参数中获取登出状态
      const urlParams = new URLSearchParams(window.location.search);
      const isJustLoggedOut = urlParams.get('logout') === 'true';
      
      if (isJustLoggedOut) {
        console.log('检测到用户刚刚登出，清除所有登录状态');
        // 显示登出成功的提示
        showToast(t('auth.logoutSuccess'), 'success', 3000);
        
        // 清除URL中的logout参数，防止页面刷新后再次触发
        if (window.history && window.history.replaceState) {
          const newUrl = window.location.href.replace('?logout=true', '').replace('&logout=true', '');
          window.history.replaceState({}, document.title, newUrl);
        }
        
        // 确保不会进行登录状态检查和重定向
        return;
      }
      
      try {
        // 检查全局登出标记
        if (window._isLoggingOut === true) {
          console.log('检测到全局登出标记，跳过登录状态检查');
          return;
        }
        
        // 使用最新的登录状态检查逻辑，避免重复检测
        const loginStatus = checkLoginStatus();
        
        if (loginStatus) {
          console.log('用户已登录，准备跳转到控制面板');
          showToast(t('auth.alreadyLoggedIn'), 'info');
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }
        
        // 初始化自定义弹窗，使用状态管理确保同一会话只显示一次
        showAuthPopup.value = shouldShowAuthPopup(AUTH_CONFIG.popup);
      } catch (error) {
        console.error("登录状态检查失败", error);
      }
    });
    
    // 验证表单
    const validateForm = () => {
      let isValid = true;
      
      // 重置错误
      errors.email = '';
      errors.password = '';
      
      // 验证邮箱
      if (!validateRequired(formData.email)) {
        errors.email = t('validation.emailRequired');
        isValid = false;
      } else if (!validateEmail(formData.email)) {
        errors.email = t('validation.emailInvalid');
        isValid = false;
      }
      
      // 验证密码
      if (!validateRequired(formData.password)) {
        errors.password = t('validation.passwordRequired');
        isValid = false;
      }
      
      return isValid;
    };
    
    // 处理登录
    const handleLogin = async () => {
      // 验证表单
      if (!validateForm()) {
        return;
      }
      
      // 设置加载状态
      loading.value = true;
      
      try {
        // 调用登录API
        const response = await login(formData);
        
        // 显示成功消息（显示3秒）
        showToast(response.message || t('auth.loginSuccess'), 'success', 3000);
        
        // 延迟跳转到仪表盘，确保消息能够显示
        setTimeout(() => {
          router.push('/dashboard');
        }, 300);
      } catch (error) {
        // 显示错误消息
        showToast(error.response?.message || error.message || t('auth.loginFailed'), 'error');
      } finally {
        // 重置加载状态
        loading.value = false;
      }
    };
    
    // 获取基于时间的问候语
    const getTimeBasedGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        return 'Good Morning';
      } else if (hour >= 12 && hour < 18) {
        return 'Good Afternoon';
      } else if (hour >= 18 && hour < 22) {
        return 'Good Evening';
      } else {
        return 'Good Night';
      }
    };
    
    return {
      formData,
      errors,
      loading,
      showPassword,
      handleLogin,
      authStatus,
      logoPath,
      handleLogoError,
      leftSideStyles,
      configLoading,
      showCaptchaModal,
      isClosingModal,
      showSiteName,
      siteNameColorClass,
      SITE_CONFIG,
      showGreeting,
      greetingMessage,
      greetingColorClass,
      getTimeBasedGreeting,
      // 自定义弹窗相关
      showAuthPopup,
      authPopupConfig,
      handleAuthPopupClose
    };
  }
};
</script>

<style lang="scss" scoped>
.login-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  
  @media (max-width: 992px) {
    overflow-y: auto;
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
}

.auth-split-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.auth-split-left {
  flex: 1;
  min-width: 500px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  
  @media (max-width: 992px) {
    display: none;
  }
  
  .left-content-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    z-index: 1;
  }
  
  .site-name {
    position: absolute;
    top: 30px;
    left: 30px;
    font-size: 1.5rem;
    font-weight: 700;
    z-index: 2;
    
    &.white {
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    &.black {
      color: #000000;
      text-shadow: 0 2px 4px rgba(255, 255, 255, 0.3);
    }
  }
  
  .greeting-text {
    position: absolute;
    bottom: 30px;
    left: 30px;
    font-size: 1.5rem;
    font-weight: 600;
    z-index: 2;
    
    &.white {
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    &.black {
      color: #000000;
      text-shadow: 0 2px 4px rgba(255, 255, 255, 0.3);
    }
  }
}

.auth-split-right {
  flex: 0.8;
  min-width: 320px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  background-color: var(--background-color);
  overflow-y: auto;
  height: 100%;
  
  @media (max-width: 992px) {
    width: 100%;
    max-width: none;
    flex: 1;
    justify-content: center;
    overflow-y: visible;
    display: flex;
    padding: 60px 0;
    min-height: 100vh;
  }
}

.top-toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 10;
  
  @media (max-width: 992px) {
    top: 10px;
    right: 10px;
  }
}

.auth-form-container {
  padding: 40px 40px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  @media (max-width: 992px) {
    padding: 20px;
    margin: auto;
    width: 100%;
  }
}

.auth-header {
  margin-bottom: 2rem;
  text-align: center;

  @media (min-width: 993px) {
    text-align: left;
  }

  .auth-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--primary-text-color);
    
    @media (min-width: 993px) {
      text-align: left;
    }
  }

  .auth-subtitle {
    font-size: 1rem;
    color: var(--secondary-text-color);
    margin-bottom: 1.5rem;
    
    @media (min-width: 993px) {
      text-align: left;
    }
  }
}

.required {
  color: #ff4d4f;
  margin-left: 4px;
  font-size: 16px;
  vertical-align: middle;
}

.input-with-icon {
  position: relative;
  width: 100%;
  
  .input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--secondary-text-color);
    width: 20px;
    height: 20px;
  }
  
  .password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--secondary-text-color);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
    
    &:hover {
      color: var(--theme-color);
    }
  }
  
  .form-control {
    padding-left: 40px;
    height: 45px;
    border-radius: 8px;
    border: 1px solid var(--input-border-color, transparent);
    background-color: var(--input-bg-color, #f9f9f9);
    transition: all 0.3s ease;
    color: var(--primary-text-color);
    
    &[type="password"],
    &[type="text"] {
      padding-right: 40px;
    }
    
    &:focus {
      outline: none;
      border-color: var(--theme-color);
      box-shadow: 0 0 0 2px var(--primary-color-focus);
      background-color: var(--input-focus-bg-color, #fff);
    }
    
    &::placeholder {
      color: var(--placeholder-color, #aaa);
    }
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  .remember-me .checkbox-container {
    display: flex;
    align-items: center;
    position: relative;
    padding-left: 30px;
    cursor: pointer;
    user-select: none;
    
    input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
      
      &:checked ~ .checkmark {
        background-color: var(--theme-color);
        border-color: var(--theme-color);
        
        &:after {
          display: block;
        }
      }
    }
    
    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 20px;
      width: 20px;
      background-color: transparent;
      border: 2px solid var(--border-color);
      border-radius: 4px;
      transition: all 0.2s ease;
      
      &:after {
        content: "";
        position: absolute;
        display: none;
        left: 5px;
        top: 0.5px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
    
    .checkbox-label {
      color: var(--secondary-text-color);
      font-size: 0.875rem;
    }
  }
  
  .forgot-password {
    color: var(--theme-color);
    font-size: 0.875rem;
    text-decoration: none;
    transition: color 0.3s ease, opacity 0.3s ease;
    
    &:hover {
      opacity: 0.8;
    }
  }
}

.btn {
  height: 45px;
  border-radius: 8px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.btn-primary {
    background-color: var(--theme-color);
    border: none;
    color: white;
    font-weight: 600;
    
    &:hover:not(:disabled) {
      background-color: var(--primary-color-hover);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .icon-right {
      margin-left: 8px;
    }
  }
}

.error-message {
  display: block;
  color: #ff4d4f;
  font-size: 0.8rem;
  margin-top: 0.3rem;
}

/* 移动设备适配 */
@media (max-width: 576px) {
  .auth-form-container {
    padding: 30px 20px;
    margin: auto;
  }
  
  .auth-split-right {
    padding: 20px 0;
  }
  
  .form-options {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    
    .remember-me {
      flex: 0 0 auto;
    }
    
    .forgot-password {
      flex: 0 0 auto;
      margin-left: auto;
    }
  }
}

/* 平板设备适配 */
@media (min-width: 576px) and (max-width: 992px) {
  .auth-split-right {
    padding: 2rem;
  }
}

/* 深色模式适配 */
.dark-theme {
  .input-with-icon {
    .input-icon {
      color: var(--secondary-text-color);
    }
    
    .form-control {
      background-color: var(--input-bg-color, #333);
      border-color: var(--input-border-color, #444);
      
      &:focus {
        background-color: var(--input-focus-bg-color, #3a3a3a);
        border-color: var(--theme-color);
      }
      
      &::placeholder {
        color: var(--placeholder-color, #777);
      }
    }
  }
  
  .checkbox-container {
    .checkbox-label {
      color: var(--secondary-text-color);
    }
    
    .checkmark {
      background-color: transparent;
      border-color: var(--border-color, #555);
    }
  }
}

.auth-footer {
  margin-top: 24px;

  a.btn {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-decoration: none;
    height: 45px !important;
    line-height: normal !important;
  }
}

.btn.btn-secondary.btn-block {
  height: 45px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: normal !important;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  background-color: transparent;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: var(--theme-color);
    background-color: rgba(var(--theme-color-rgb), 0.05);
    color: var(--theme-color) !important;
    -webkit-text-fill-color: var(--theme-color) !important;
    background-image: none !important;
  }
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  svg {
    display: none;
  }
  
  &::before {
    content: "";
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }
  
  span {
    display: inline-block;
    animation: pulse 1.5s infinite ease-in-out;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auth-logo {
  margin-bottom: 1.5rem;
  text-align: center;
  
  @media (min-width: 993px) {
    text-align: left;
  }
  
  img {
    width: 60px;
    height: 60px;
    min-width: 60px;
    min-height: 60px;
    border-radius: 12px;
    object-fit: cover;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 100vh;
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(var(--theme-color-rgb), 0.3);
    border-radius: 50%;
    border-top-color: var(--theme-color);
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
  
  p {
    color: var(--secondary-text-color);
    font-size: 1rem;
  }
}

@media (min-width: 993px) and (max-height: 700px) {
  .auth-split-right {
    justify-content: flex-start;
  }
}
</style> 