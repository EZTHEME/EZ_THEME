<template>
  <div class="forgot-password-view-container">
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
            <h1 class="auth-title">{{ $t('auth.forgotPasswordTitle') }}</h1>
            <p class="auth-subtitle">{{ $t('auth.forgotPasswordSubtitle') }}</p>
          </div>
          
          <form class="auth-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label for="email">{{ $t('common.email') }} <span class="required">*</span></label>
              <div class="input-with-icon">
                <IconMail class="input-icon" />
                <input
                  type="email"
                  id="email"
                  class="form-control"
                  v-model="formData.email"
                  :placeholder="$t('auth.emailPlaceholder')"
                />
              </div>
              <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
            </div>
            
            <div class="form-group">
              <label for="verificationCode">{{ $t('common.verificationCode') }} <span class="required">*</span></label>
              <div class="input-with-button">
                <div class="input-with-icon verification-input">
                  <IconCode class="input-icon" />
                  <input
                    type="text"
                    id="verificationCode"
                    class="form-control"
                    v-model="formData.verificationCode"
                    :placeholder="$t('auth.codePlaceholder')"
                  />
                </div>
                <button
                  class="send-code-btn"
                  @click="sendVerificationCode"
                  :disabled="!isValidEmail(formData.email) || cooldown > 0 || loading"
                  type="button"
                >
                  <IconSend v-if="cooldown === 0" class="icon-left" />
                  <span>{{ cooldown > 0 ? `${cooldown}s` : $t('common.sendCode') }}</span>
                </button>
              </div>
              <div v-if="errors.verificationCode" class="error-message">{{ errors.verificationCode }}</div>
            </div>
            
            <div class="form-group">
              <label for="newPassword">{{ $t('auth.newPassword') }} <span class="required">*</span></label>
              <div class="input-with-icon">
                <IconLock class="input-icon" />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  id="newPassword"
                  class="form-control"
                  v-model="formData.newPassword"
                  :placeholder="$t('auth.newPasswordPlaceholder')"
                />
                <div class="password-toggle" @click="showPassword = !showPassword">
                  <IconEye v-if="!showPassword" />
                  <IconEyeOff v-else />
                </div>
              </div>
              <div v-if="errors.newPassword" class="error-message">{{ errors.newPassword }}</div>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">{{ $t('common.confirmPassword') }} <span class="required">*</span></label>
              <div class="input-with-icon">
                <IconLock class="input-icon" />
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  id="confirmPassword"
                  class="form-control"
                  v-model="formData.confirmPassword"
                  :placeholder="$t('auth.confirmPasswordPlaceholder')"
                />
                <div class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
                  <IconEye v-if="!showConfirmPassword" />
                  <IconEyeOff v-else />
                </div>
              </div>
              <div v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</div>
            </div>
            
            <button
              class="btn btn-primary btn-block"
              :disabled="loading || !formData.email || !formData.verificationCode || !formData.newPassword || !formData.confirmPassword"
              type="submit"
            >
              <span v-if="loading" class="loading-wrapper">
                <span>{{ $t('common.loading') }}</span>
              </span>
              <span v-else>
                {{ $t('common.resetPassword') }}
                <IconArrowRight class="icon-right" />
              </span>
            </button>
          </form>
          
          <div class="auth-footer">
            <div class="auth-divider">
              <span class="auth-divider-text">{{ $t('auth.rememberPassword') }}</span>
            </div>
            
            <router-link to="/login" class="btn btn-secondary btn-block" replace>
              {{ $t('common.login') }}
            </router-link>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 验证码弹窗 -->
    <div class="captcha-modal" v-if="showCaptchaModal" :class="{ 'closing': isClosingModal }">
      <div class="captcha-modal-overlay" @click="closeCaptchaModal"></div>
      <div class="captcha-modal-content" :class="{ 'closing': isClosingModal }">
        <div class="captcha-modal-header">
          <h3>{{ $t('auth.captcha') }}</h3>
          <button class="close-btn" @click="closeCaptchaModal">
            <span>&times;</span>
          </button>
        </div>
        <div class="captcha-modal-body">
          <p>{{ $t('auth.captchaRequired') }}</p>
          
          <!-- Google reCAPTCHA -->
          <div v-if="captchaConfig.type === 'google'" class="google-captcha" @click.stop>
            <div id="modal-recaptcha"></div>
          </div>
          
          <!-- Cloudflare Turnstile -->
          <div v-else-if="captchaConfig.type === 'cloudflare'" class="cloudflare-captcha" @click.stop>
            <div id="modal-turnstile"></div>
          </div>
        </div>
      </div>
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
import { reactive, ref, onMounted, onBeforeUnmount, computed, getCurrentInstance, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSelector from '@/components/common/LanguageSelector.vue';
import { isValidEmail } from '@/utils/validators';
import { useToast } from '@/composables/useToast';
import IconMail from '@/components/icons/IconMail.vue';
import IconCode from '@/components/icons/IconCode.vue';
import IconLock from '@/components/icons/IconLock.vue';
import IconArrowRight from '@/components/icons/IconArrowRight.vue';
import IconSend from '@/components/icons/IconSend.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconEyeOff from '@/components/icons/IconEyeOff.vue';
import { resetPassword, sendEmailVerify, checkLoginStatus, getWebsiteConfig } from '@/api/auth';
import { applyDomainAuth } from '@/utils/licenseAuth';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import { CAPTCHA_CONFIG, AUTH_LAYOUT_CONFIG, SITE_CONFIG, AUTH_CONFIG } from '@/utils/baseConfig';
import AuthPopup from '@/components/auth/AuthPopup.vue';
import { shouldShowAuthPopup } from '@/utils/authPopupState';

// 添加全局回调函数 - 主验证码回调
window.onCaptchaForgotPasswordVerified = function(response) {
  // 使用全局变量访问组件实例
  if (window._forgotPasswordInstance) {
    window._forgotPasswordInstance.handleCaptchaResponse(response);
  }
};

// 添加验证码弹窗的全局回调函数
window.onCaptchaForgotPasswordModalVerified = function(response) {
  // 使用全局变量访问组件实例
  if (window._forgotPasswordInstance) {
    // 调用处理函数，它会保存响应并自动关闭弹窗
    window._forgotPasswordInstance.handleCaptchaModalResponse(response);
  }
};

// 在组件外部定义一个全局变量来跟踪 reCAPTCHA 是否已渲染
let isGoogleModalRecaptchaRendered = false;

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

export default {
  name: 'ForgotPasswordView',
  components: {
    ThemeToggle,
    LanguageSelector,
    IconMail,
    IconCode,
    IconLock,
    IconArrowRight,
    IconSend,
    IconEye,
    IconEyeOff,
    DomainAuthAlert,
    AuthPopup
  },
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const { showToast } = useToast();
    
    const loading = ref(false);
    const configLoading = ref(true);
    const configLoaded = ref(false);
    const cooldown = ref(0);
    const showPassword = ref(false);
    
    // 验证码弹窗相关
    const showCaptchaModal = ref(false);
    const captchaModalResponse = ref('');
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
    
    // logo路径处理
    const logoPath = ref('./images/logo.png');
    const handleLogoError = () => {
      logoPath.value = '/images/logo.png';
    };
    
    // 域名授权状态
    const authStatus = ref({
      isAuthorized: true,
      apiDomain: ''
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
    
    // 网站名称显示控制
    const showSiteName = computed(() => {
      return AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.siteName?.show !== false;
    });
    
    // 网站名称颜色类
    const siteNameColorClass = computed(() => {
      const color = AUTH_LAYOUT_CONFIG?.splitLayout?.leftContent?.siteName?.color || 'white';
      return color.toLowerCase() === 'black' ? 'black' : 'white';
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
    
    // 网站配置
    const config = reactive({
      is_email_verify: 1,
      is_recaptcha: 0,
      recaptcha_site_key: ''
    });
    
    // 验证码配置
    const captchaConfig = reactive({
      type: CAPTCHA_CONFIG.captchaType,
      siteKey: '',
      verifyUrl: CAPTCHA_CONFIG[CAPTCHA_CONFIG.captchaType]?.verifyUrl || ''
    });
    
    const formData = reactive({
      email: '',
      verificationCode: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    const errors = reactive({
      email: '',
      verificationCode: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // 密码可见性状态
    const showConfirmPassword = ref(false);
    
    const captchaResponse = ref('');
    
    const app = getCurrentInstance();
    
    // 保存组件实例到全局，用于验证码回调
    if (app && app.proxy) {
      window._forgotPasswordInstance = {
        handleCaptchaResponse: (response) => {
          captchaResponse.value = response;
        },
        handleCaptchaModalResponse: (response) => {
          // 增加更详细的日志以便调试
          // console.log('忘记密码页面收到验证码响应:', {
          //   responseType: typeof response,
          //   responseExists: !!response,
          //   responseLength: response ? response.length : 0,
          //   responsePreview: response ? response.substring(0, 10) + '...' : null
          // });
          
          // Cloudflare Turnstile验证成功时会传递一个非空字符串token
          // 验证Google reCAPTCHA和Cloudflare Turnstile的响应
          if (response && typeof response === 'string' && response.trim().length > 0) {
            captchaModalResponse.value = response;
            // console.log('验证码验证成功，准备关闭弹窗并发送验证码');
            
            // 验证已通过，关闭弹窗并发送验证码
            setTimeout(() => {
              closeCaptchaModal();
              sendVerificationCodeWithCaptcha(response);
            }, 300); // 增加延迟时间以确保UI更新完成
          } else {
            // console.error('验证码响应无效:', response);
          }
        }
      };
    }
    
    // 获取网站配置
    const fetchWebsiteConfig = async () => {
      try {
        configLoading.value = true;
        const response = await getWebsiteConfig();
        
        if (response && response.data) {
          // 更新配置
          Object.assign(config, response.data);
          
          // 如果配置中包含验证码相关设置
          if (config.is_recaptcha === 1) {
            // 根据验证码类型设置siteKey
            if (captchaConfig.type === 'google') {
              captchaConfig.siteKey = response.data.recaptcha_site_key;
            } else if (captchaConfig.type === 'cloudflare') {
              captchaConfig.siteKey = CAPTCHA_CONFIG.cloudflare.siteKey;
            }
            
            // 加载验证码脚本
            await loadCaptchaScript();
          }
          
          configLoaded.value = true;
          
          // 初始化自定义弹窗，使用状态管理确保同一会话只显示一次
          showAuthPopup.value = shouldShowAuthPopup(AUTH_CONFIG.popup);
        }
      } catch (error) {
        console.error('无法获取网站配置:', error);
        showToast(t('errors.configLoadFailed'), 'error');
      } finally {
        configLoading.value = false;
      }
    };
    
    // 加载验证码脚本
    const loadCaptchaScript = () => {
      return new Promise((resolve) => {
        if (config.is_recaptcha !== 1 || !config.recaptcha_site_key) {
          resolve();
          return;
        }
        
        // 处理谷歌 reCAPTCHA
        if (captchaConfig.type === 'google' && window.grecaptcha) {
          // 如果谷歌 reCAPTCHA 已加载，重置标志，允许在新容器中重新渲染
          isGoogleModalRecaptchaRendered = false;
          resolve();
          return;
        }
        
        // 如果Turnstile已经加载并且页面切换后返回，尝试重用实例
        if (window.turnstile && captchaConfig.type === 'cloudflare') {
          console.log('Turnstile已存在，尝试重置而不是重新加载脚本');
          
          try {
            // 尝试重置现有的Turnstile实例
            if (window.turnstile.reset) {
              window.turnstile.reset();
            }
            
            // 检查是否有已渲染的Turnstile容器
            const modalContainer = document.getElementById('modal-turnstile');
            if (modalContainer) {
              // 清空容器并重新渲染
              modalContainer.innerHTML = '';
              
              // 延迟一点时间确保DOM已更新
              setTimeout(() => {
                // 重新渲染验证码
                window.turnstile.render('#modal-turnstile', {
                  'sitekey': captchaConfig.siteKey,
                  'callback': function(token) {
                    if (window._forgotPasswordInstance) {
                      window._forgotPasswordInstance.handleCaptchaModalResponse(token);
                    }
                  },
                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                  'retry': 'auto', // 错误时自动重试
                  'retry-interval': 5000, // 重试间隔
                  'refresh-expired': 'manual', // 过期后手动刷新，防止自动刷新
                  'tabindex': 0, // 改善无障碍访问
                  // 防止自动刷新和点击外部区域错误
                  'execution': 'render' // 在渲染时执行，而非等待用户交互
                });
                
                resolve();
              }, 100);
              return;
            }
          } catch (e) {
            console.error('重置Turnstile失败，将尝试重新加载脚本', e);
          }
        }
        
        // 先清理现有实例
        const cleanupExistingCaptcha = () => {
          // 清除验证码容器内容
          const recaptchaContainer = document.getElementById('modal-recaptcha');
          if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '';
          }
          
          const turnstileContainer = document.getElementById('modal-turnstile');
          if (turnstileContainer) {
            turnstileContainer.innerHTML = '';
          }
          
          // 重置 Google reCAPTCHA 渲染标志
          isGoogleModalRecaptchaRendered = false;
        };
        
        // 清理验证码容器内容
        cleanupExistingCaptcha();
        
        // 只有在turnstile不存在或者重置失败时才重新加载脚本
        if (!window.turnstile || captchaConfig.type !== 'cloudflare') {
          const script = document.createElement('script');
          
          if (captchaConfig.type === 'google') {
            const googleVerifyUrl = 'https://www.recaptcha.net';
            script.src = `${googleVerifyUrl}/recaptcha/api.js?onload=captchaScriptLoaded&render=explicit`;
          } else if (captchaConfig.type === 'cloudflare') {
            script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=captchaScriptLoaded&render=explicit`;
          }
          
          script.async = true;
          script.defer = true;
          
          // 定义全局回调函数
          window.captchaScriptLoaded = () => {
            console.log('验证码脚本加载完成');
            setTimeout(() => {
              resolve();
            }, 100);
          };
          
          document.head.appendChild(script);
        } else {
          // 如果已存在脚本但重置失败，直接渲染
          resolve();
        }
      });
    };
    
    // 显示验证码弹窗
    const showCaptchaModalDialog = () => {
      showCaptchaModal.value = true;
      captchaModalResponse.value = '';
      
      // 确保每次打开弹窗时都重新加载验证码
      const renderCaptcha = async () => {
        // 如果需要，重新加载验证码脚本
        if (config.is_recaptcha === 1 && captchaConfig.siteKey) {
          // 重新加载验证码脚本
          await loadCaptchaScript();
          
          // 延迟一点时间确保弹窗DOM已渲染
          setTimeout(() => {
            // 确保验证码组件已加载并渲染
            if (captchaConfig.type === 'google' && window.grecaptcha) {
              // 清除之前的实例
              const container = document.getElementById('modal-recaptcha');
              if (container && !isGoogleModalRecaptchaRendered) {
                container.innerHTML = '';
                
                try {
                  // 创建新的验证码实例
                  window.grecaptcha.render('modal-recaptcha', {
                    'sitekey': captchaConfig.siteKey,
                    'callback': 'onCaptchaForgotPasswordModalVerified',
                    'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light'
                  });
                  isGoogleModalRecaptchaRendered = true;
                } catch (error) {
                  console.error('Google reCAPTCHA渲染错误:', error);
                  // 如果是已渲染的错误，继续将标记设为 true，否则重置为 false 以便下次尝试
                  if (error.toString().includes('has already been rendered')) {
                    isGoogleModalRecaptchaRendered = true;
                  } else {
                    isGoogleModalRecaptchaRendered = false;
                  }
                }
              }
            } else if (captchaConfig.type === 'cloudflare' && window.turnstile) {
              // 清除之前的实例
              const container = document.getElementById('modal-turnstile');
              if (container) {
                container.innerHTML = '';
                
                // 如果存在旧的Turnstile实例，先尝试重置
                if (window.turnstile.reset) {
                  try {
                    window.turnstile.reset();
                  } catch (e) {
                    console.log('无法重置Turnstile验证码，将重新渲染');
                  }
                }
                
                try {
                  // 创建新的验证码实例，使用官方推荐的方式
                  window.turnstile.render('#modal-turnstile', {
                    'sitekey': captchaConfig.siteKey,
                    'callback': function(token) {
                      if (window._forgotPasswordInstance) {
                        window._forgotPasswordInstance.handleCaptchaModalResponse(token);
                      }
                    },
                    'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                    'retry': 'auto', // 错误时自动重试
                    'retry-interval': 5000, // 重试间隔
                    'refresh-expired': 'manual', // 过期后手动刷新，防止自动刷新
                    'tabindex': 0, // 改善无障碍访问
                    // 防止自动刷新和点击外部区域错误
                    'execution': 'render' // 在渲染时执行，而非等待用户交互
                  });
                } catch (error) {
                  console.error('Turnstile渲染错误:', error);
                  
                  // 发生错误时尝试先完全移除脚本再重新加载
                  const scripts = document.getElementsByTagName('script');
                  for (let i = scripts.length - 1; i >= 0; i--) {
                    if (scripts[i].src.includes('turnstile')) {
                      scripts[i].parentNode.removeChild(scripts[i]);
                    }
                  }
                  
                  // 延迟后重新加载脚本
                  setTimeout(() => {
                    const script = document.createElement('script');
                    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=captchaScriptLoaded&render=explicit`;
                    script.async = true;
                    script.defer = true;
                    document.head.appendChild(script);
                  }, 500);
                }
              } else {
                console.error('找不到modal-turnstile容器');
              }
            } else {
              console.error('验证码脚本未加载或配置不正确', { 
                type: captchaConfig.type, 
                hasGoogle: !!window.grecaptcha, 
                hasTurnstile: !!window.turnstile
              });
            }
          }, 300); // 增加延迟时间确保DOM已完全渲染
        }
      };
      
      // 执行验证码渲染
      renderCaptcha();
    };
    
    // 关闭验证码弹窗
    const closeCaptchaModal = () => {
      isClosingModal.value = true;
      
      // 给动画时间完成
      setTimeout(() => {
        showCaptchaModal.value = false;
        isClosingModal.value = false;
        
        // 在弹窗完全关闭后，清除验证码容器并重置标志
        setTimeout(() => {
          const recaptchaContainer = document.getElementById('modal-recaptcha');
          if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '';
          }
          // 重置Google reCAPTCHA渲染标志，允许下次重新渲染
          isGoogleModalRecaptchaRendered = false;
        }, 300);
      }, 300);
    };
    
    // 处理验证码弹窗的验证响应
    const handleCaptchaModalResponse = (response) => {
      // 增加更详细的日志以便调试
      // console.log('忘记密码页面收到验证码响应:', {
      //   responseType: typeof response,
      //   responseExists: !!response,
      //   responseLength: response ? response.length : 0,
      //   responsePreview: response ? response.substring(0, 10) + '...' : null
      // });
      
      // Cloudflare Turnstile验证成功时会传递一个非空字符串token
      // 验证Google reCAPTCHA和Cloudflare Turnstile的响应
      if (response && typeof response === 'string' && response.trim().length > 0) {
        captchaModalResponse.value = response;
        // console.log('验证码验证成功，准备关闭弹窗并发送验证码');
        
        // 验证已通过，关闭弹窗并发送验证码
        setTimeout(() => {
          closeCaptchaModal();
          sendVerificationCodeWithCaptcha(response);
        }, 300); // 增加延迟时间以确保UI更新完成
      } else {
        // console.error('验证码响应无效:', response);
      }
    };
    
    // 带验证码发送验证码
    const sendVerificationCodeWithCaptcha = async (captchaData) => {
      try {
        loading.value = true;
        
        // 执行验证码发送逻辑
        const sendData = {
          email: formData.email,
          // 添加忘记密码标记，该参数仅在Xiao-V2board面板类型下有效
          isForgetPassword: true
        };
        
        // 如果有验证码数据，添加到请求中
        if (captchaData) {
          sendData.recaptcha_data = captchaData;
        }
        
        // 调用发送验证码API
        const response = await sendEmailVerify(sendData);
        
        if (response && response.data === true) {
          startCooldown();
          showToast(response.message || t('auth.codeSent'), 'success');
          
          // 根据配置决定是否显示检查垃圾邮件的提示
          if (AUTH_CONFIG.verificationCode && AUTH_CONFIG.verificationCode.showCheckSpamTip) {
            // 使用配置中的延迟时间
            const delay = AUTH_CONFIG.verificationCode.checkSpamTipDelay || 1000;
            setTimeout(() => {
              showToast(t('auth.checkSpam'), 'info');
            }, delay);
          }
        } else {
          throw new Error(response.message || t('auth.sendCodeFailed'));
        }
      } catch (error) {
        showToast(error.response?.message || error.message || t('auth.sendCodeFailed'), 'error');
      } finally {
        loading.value = false;
      }
    };
    
    // 发送验证码
    const sendVerificationCode = async () => {
      // 重置错误
      errors.email = '';
      
      // 验证邮箱
      if (!formData.email) {
        errors.email = t('auth.emailRequired');
        return;
      }
      
      if (!isValidEmail(formData.email)) {
        errors.email = t('auth.emailInvalid');
        return;
      }
      
      // 检查是否需要验证码
      if (config.is_recaptcha === 1 && captchaConfig.siteKey) {
        // 检查验证码是否已验证
        const captchaSuccessElement = document.querySelector('.cloudflare-success-message') || 
                                     document.querySelector('.recaptcha-success');
        const isCaptchaVerified = !!captchaResponse.value || 
                                  (captchaSuccessElement && captchaSuccessElement.style.display !== 'none');
        
        if (isCaptchaVerified) {
          // 如果验证码已验证，直接使用现有响应
          const captchaData = captchaResponse.value || 
                            document.querySelector('[name="g-recaptcha-response"]')?.value || 
                            document.querySelector('[name="cf-turnstile-response"]')?.value;
          sendVerificationCodeWithCaptcha(captchaData);
        } else {
          // 否则显示验证码弹窗
          showCaptchaModalDialog();
        }
      } else {
        // 不需要验证码，直接发送
        sendVerificationCodeWithCaptcha();
      }
    };
    
    // 验证码倒计时
    const startCooldown = () => {
      cooldown.value = 60;
      const timer = setInterval(() => {
        cooldown.value--;
        if (cooldown.value <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    };
    
    // 处理表单提交
    const handleSubmit = async () => {
      // 重置所有错误
      errors.email = '';
      errors.verificationCode = '';
      errors.newPassword = '';
      errors.confirmPassword = '';
      
      // 验证所有字段
      let isValid = true;
      
      // 验证邮箱
      if (!formData.email) {
        errors.email = t('auth.emailRequired');
        isValid = false;
      } else if (!isValidEmail(formData.email)) {
        errors.email = t('auth.emailInvalid');
        isValid = false;
      }
      
      // 验证验证码
      if (!formData.verificationCode) {
        errors.verificationCode = t('auth.codeRequired');
        isValid = false;
      }
      
      // 验证密码
      if (!formData.newPassword) {
        errors.newPassword = t('auth.passwordRequired');
        isValid = false;
      } else if (formData.newPassword.length < 8) {
        errors.newPassword = t('auth.passwordTooShort');
        isValid = false;
      }
      
      // 验证确认密码
      if (!formData.confirmPassword) {
        errors.confirmPassword = t('auth.confirmPasswordRequired');
        isValid = false;
      } else if (formData.newPassword !== formData.confirmPassword) {
        errors.confirmPassword = t('auth.passwordsDoNotMatch');
        isValid = false;
      }
      
      if (!isValid) return;
      
      try {
        loading.value = true;
        
        // 构建重置密码请求数据
        const resetData = {
          email: formData.email,
          password: formData.newPassword,
          email_code: parseInt(formData.verificationCode)
        };
        
        // 添加验证码数据（如果需要）
        if (config.is_recaptcha === 1) {
          // 优先使用已存储的验证响应
          if (captchaResponse.value) {
            resetData.recaptcha_data = captchaResponse.value;
          } else {
            // 尝试从DOM中获取验证响应
            const captchaElement = document.querySelector('[name="g-recaptcha-response"]') || 
                                  document.querySelector('[name="cf-turnstile-response"]');
            if (captchaElement && captchaElement.value) {
              resetData.recaptcha_data = captchaElement.value;
            }
          }
        }
        
        // 调用重置密码API
        const response = await resetPassword(resetData);
        
        if (response.data === true) {
          // 重置密码成功
          showToast(response.message || t('auth.passwordResetSuccess'), 'success');
          
          // 跳转到登录页
          router.push('/login');
        } else {
          throw new Error(response.message || t('auth.passwordResetFailed'));
        }
      } catch (error) {
        showToast(error.response?.message || error.message || t('auth.passwordResetFailed'), 'error');
      } finally {
        loading.value = false;
      }
    };
    
    // 检查登录状态和初始化验证码
    onMounted(() => {
      // 应用域名授权验证
      authStatus.value = applyDomainAuth();
      
      // 获取网站配置
      fetchWebsiteConfig();
      
      // 添加额外事件监听器，处理路由返回时重新加载验证码
      window.addEventListener('focus', () => {
        if (configLoaded.value && config.is_recaptcha === 1) {
          loadCaptchaScript();
        }
      });
      
      // 从URL参数中获取登出状态
      const urlParams = new URLSearchParams(window.location.search);
      const isJustLoggedOut = urlParams.get('logout') === 'true';
      
      if (isJustLoggedOut) {
        // console.log('检测到用户刚刚登出，清除所有登录状态');
        // 显示登出成功的提示
        showToast(t('auth.logoutSuccess'), 'success');
        
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
          // console.log('检测到全局登出标记，跳过登录状态检查');
          return;
        }
        
        // 使用最新的登录状态检查逻辑，避免重复检测
        const loginStatus = checkLoginStatus();
        
        if (loginStatus) {
          // console.log('用户已登录，准备跳转到控制面板');
          showToast(t('auth.alreadyLoggedIn'), 'info');
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }
      } catch (error) {
        // console.error("登录状态检查失败", error);
      }
    });
    
    // 当组件被keep-alive激活时调用
    onActivated(() => {
      // 如果配置已加载且需要验证码，重新初始化Cloudflare Turnstile
      if (configLoaded.value && config.is_recaptcha === 1 && captchaConfig.type === 'cloudflare') {
        console.log('组件激活，重新加载Cloudflare Turnstile验证组件');
        loadCaptchaScript().then(() => {
          // 清理旧的Turnstile验证码实例
          if (window.turnstile && window.turnstile.reset) {
            // 尝试通过reset方法重置验证码，如果可能的话
            try {
              // 首先尝试重置所有验证码
              window.turnstile.reset();
            } catch (e) {
              console.log('Turnstile重置失败，将重新渲染验证码组件');
              
              const container = document.getElementById('modal-turnstile');
              if (container && window.turnstile.render) {
                container.innerHTML = '';
                
                // 重新渲染Cloudflare Turnstile验证码
                window.turnstile.render('#modal-turnstile', {
                  'sitekey': captchaConfig.siteKey,
                  'callback': function(token) {
                    if (window._forgotPasswordInstance) {
                      window._forgotPasswordInstance.handleCaptchaModalResponse(token);
                    }
                  },
                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                  'retry-interval': 3000
                });
              }
            }
          }
        });
      }
    });
    
    // 组件卸载前清理验证码相关资源
    onBeforeUnmount(() => {
      // 重置 reCAPTCHA 标志
      isGoogleModalRecaptchaRendered = false;
      
      // 使用 Turnstile 的正式 API 方法重置验证码实例
      if (window.turnstile && window.turnstile.reset) {
        try {
          window.turnstile.reset();
        } catch (e) {
          console.log('Turnstile重置失败', e);
        }
      }
      
      // 清除验证码容器内容而不是移除脚本
      const turnstileContainer = document.getElementById('modal-turnstile');
      if (turnstileContainer) {
        turnstileContainer.innerHTML = '';
      }
      
      // 重置状态变量
      captchaResponse.value = '';
      captchaModalResponse.value = '';
      
      // 不要移除全局验证码对象，只清理回调
      window.captchaScriptLoaded = undefined;
      window.onCaptchaForgotPasswordVerified = undefined;
      window.onCaptchaForgotPasswordModalVerified = undefined;
      
      // 清理全局引用
      window._forgotPasswordInstance = null;
    });
    
    return {
      formData,
      errors,
      loading,
      cooldown,
      sendVerificationCode,
      handleSubmit,
      isValidEmail,
      showPassword,
      showConfirmPassword,
      authStatus,
      logoPath,
      handleLogoError,
      config,
      captchaConfig,
      showCaptchaModal,
      closeCaptchaModal,
      handleCaptchaModalResponse,
      isClosingModal,
      leftSideStyles,
      configLoading,
      configLoaded,
      showSiteName,
      siteNameColorClass,
      SITE_CONFIG,
      showGreeting,
      greetingMessage,
      greetingColorClass,
      // 自定义弹窗相关
      showAuthPopup,
      authPopupConfig,
      handleAuthPopupClose
    };
  }
};
</script>

<style lang="scss" scoped>
/* 添加外层容器样式 */
.forgot-password-view-container {
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

/* 让表单在大屏幕垂直居中，如果内容高度不足则居顶 */
@media (min-width: 993px) and (max-height: 850px) {
  .auth-split-right {
    justify-content: flex-start;
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

.input-with-button {
  display: flex;
  align-items: stretch;
  height: 45px;
  width: 100%;
  
  .verification-input {
    flex: 1;
    
    .form-control {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      height: 100%;
    }
  }
  
  .send-code-btn {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    padding: 0 15px;
    min-width: 100px;
    white-space: nowrap;
    font-size: 0.875rem;
    border: none;
    background-color: var(--theme-color) !important;
    color: white !important;
    margin: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.3s, opacity 0.3s, transform 0.3s;
    
    &:hover:not(:disabled) {
      background-color: var(--primary-color-hover) !important;
      transform: translateY(-2px);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: translateY(0);
    }
    
    &:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      }
    }
    
    .icon-left {
      margin-right: 5px;
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

.captcha-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modalFadeIn 0.3s ease;
  
  &.closing {
    animation: modalFadeOut 0.3s ease forwards;
  }
  
  .captcha-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
  
  .captcha-modal-content {
    position: relative;
    z-index: 2;
    background-color: var(--card-background, #fff);
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 400px;
    animation: modalSlideIn 0.3s ease;
    
    &.closing {
      animation: modalSlideOut 0.3s ease forwards;
    }
    
    .captcha-modal-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
      
      h3 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--primary-text-color);
      }
      
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--secondary-text-color);
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        transition: all 0.2s;
        
        &:hover {
          background-color: var(--hover-bg-color, rgba(0, 0, 0, 0.05));
        }
      }
    }
    
    .captcha-modal-body {
      padding: 20px;
      
      p {
        margin-top: 0;
        margin-bottom: 16px;
        color: var(--secondary-text-color);
      }
      
      .google-captcha,
      .cloudflare-captcha {
        display: flex;
        justify-content: center;
        margin: 16px 0;
      }
    }
  }
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes modalSlideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes modalSlideOut {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(20px); opacity: 0; }
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

.forgot-password, .auth-footer a, a {
  color: var(--theme-color);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.3s, opacity 0.3s, transform 0.3s;
  position: relative;
  display: inline-block;
  
  &:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }
}

.btn.btn-secondary.btn-block {
  height: 45px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: normal !important;
  color: var(--text-color) !important;
  border: 1px solid var(--border-color) !important;
  background-color: transparent !important;
  transition: all 0.3s ease !important;
  
  &:hover {
    border-color: var(--theme-color) !important;
    background-color: rgba(var(--theme-color-rgb), 0.05) !important;
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
    display: none; /* 隐藏原有的svg图标 */
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

/* 移动设备适配 */
@media (max-width: 576px) {
  .auth-split-right {
    padding: 20px 0;
  }
  
  .auth-form-container {
    padding: 30px 20px;
    margin: auto;
  }
  
  .auth-header {
    margin-bottom: 1.5rem;
    
    .auth-logo img {
      height: 50px;
    }
    
    .auth-title {
      font-size: 1.5rem;
    }
  }
}

/* 平板设备适配 */
@media (min-width: 576px) and (max-width: 992px) {
  .auth-split-right {
    max-width: none;
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
  
  .input-with-button {
    .send-code-btn {
      background-color: var(--theme-color);
      
      &:hover:not(:disabled) {
        background-color: var(--primary-color-hover);
      }
    }
  }
  
  .btn-primary {
    background-color: var(--theme-color);
    
    &:hover:not(:disabled) {
      background-color: var(--primary-color-hover);
    }
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
</style> 