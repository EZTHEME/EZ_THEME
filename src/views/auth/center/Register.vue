<template>
  <div class="auth-container">
    <!-- 域名授权验证提示 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="floating-ball ball-1"></div>
      <div class="floating-ball ball-2"></div>
      <div class="floating-ball ball-3"></div>
    </div>
    
    <!-- 顶部工具栏：语言选择器和主题切换 -->
    <div class="top-toolbar">
      <ThemeToggle />
      <LanguageSelector />
    </div>
    
    <div class="auth-card" v-if="configLoading">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="">{{ $t('common.loading') }}</p>
      </div>
    </div>
    
    <div class="auth-card" v-else>
      <div class="auth-header">
        <div class="auth-logo">
          <img 
            :src="logoPath" 
            alt="Logo" 
            @error="handleLogoError" 
          />
        </div>
        <h1 class="auth-title">{{ $t('auth.registerTitle') }}</h1>
        <p class="auth-subtitle">{{ config.app_description || $t('auth.registerSubtitle') }}</p>
      </div>
      
      <form class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="email" class="form-label">{{ $t('common.email') }} <span class="required">*</span></label>
          
          <!-- 有邮箱白名单的情况 -->
          <div class="input-with-suffix" v-if="config.email_whitelist_suffix && config.email_whitelist_suffix.length > 0">
            <div class="input-with-icon email-prefix">
              <IconMail class="input-icon" />
              <input 
                type="text" 
                id="emailPrefix" 
                class="form-control" 
                v-model="emailPrefix" 
                :placeholder="$t('auth.emailPrefixPlaceholder')"
                @input="handleEmailPrefixChange"
                :disabled="codeSent"
                required
              />
            </div>
            <div class="email-suffix-separator">@</div>
            <div class="email-suffix" @click="toggleSuffixDropdown" :class="{ disabled: codeSent }">
              <div class="suffix-text">{{ selectedSuffix }}</div>
              <IconChevronDown class="suffix-icon" :class="{ 'rotate-180': showSuffixDropdown }" />
              
              <div class="suffix-dropdown" v-if="showSuffixDropdown">
                <div 
                  v-for="suffix in config.email_whitelist_suffix" 
                  :key="suffix"
                  class="suffix-option"
                  :class="{ active: suffix === selectedSuffix }"
                  @click.stop="selectSuffix(suffix)"
                >
                  {{ suffix }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- 无邮箱白名单的情况 -->
          <div class="input-with-icon" v-else>
            <IconMail class="input-icon" />
            <input 
              type="email" 
              id="email" 
              class="form-control" 
              v-model="formData.email" 
              :placeholder="$t('auth.emailPlaceholder')"
              :disabled="codeSent"
              required
            />
          </div>
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>
        
        <!-- 验证码输入框 (仅当is_email_verify为1时显示) -->
        <div class="form-group" v-if="config.is_email_verify === 1">
          <label for="verificationCode" class="form-label">{{ $t('common.verificationCode') }} <span class="required">*</span></label>
          <div class="input-with-button">
            <div class="input-with-icon verification-input">
              <IconCode class="input-icon" />
              <input 
                type="text" 
                id="verificationCode" 
                class="form-control" 
                v-model="formData.verificationCode" 
                :placeholder="$t('auth.codePlaceholder')"
                required
              />
            </div>
            <button 
              type="button" 
              class="send-code-btn" 
              @click="sendVerificationCode"
              :disabled="!isValidEmail(formData.email) || cooldown > 0 || loading"
            >
              <IconSend v-if="cooldown === 0" class="icon-left" />
              <span v-if="cooldown > 0" class="">{{ cooldown }}s</span>
              <span v-else class="">{{ $t('common.sendCode') }}</span>
            </button>
          </div>
          <span v-if="errors.verificationCode" class="error-message">{{ errors.verificationCode }}</span>
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">{{ $t('common.password') }} <span class="required">*</span></label>
          <div class="input-with-icon">
            <IconLock class="input-icon" />
            <input 
              :type="showPassword ? 'text' : 'password'"
              id="password" 
              class="form-control" 
              v-model="formData.password" 
              :placeholder="$t('auth.passwordPlaceholder')"
              required
            />
            <div class="password-toggle" @click="showPassword = !showPassword">
              <IconEye v-if="!showPassword" />
              <IconEyeOff v-else />
            </div>
          </div>
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>
        
        <div class="form-group">
          <label for="confirmPassword" class="form-label">{{ $t('common.confirmPassword') }} <span class="required">*</span></label>
          <div class="input-with-icon">
            <IconLock class="input-icon" />
            <input 
              :type="showConfirmPassword ? 'text' : 'password'"
              id="confirmPassword" 
              class="form-control" 
              v-model="formData.confirmPassword" 
              :placeholder="$t('auth.confirmPasswordPlaceholder')"
              required
            />
            <div class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
              <IconEye v-if="!showConfirmPassword" />
              <IconEyeOff v-else />
            </div>
          </div>
          <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
        </div>
        
        <!-- 邀请码输入框 (显示在所有情况下，但根据is_invite_force决定是否必填) -->
        <div class="form-group">
          <label for="inviteCode" class="form-label">
            {{ $t('auth.inviteCode') }} 
            <span class="required" v-if="config.is_invite_force === 1">*</span>
            <span class="optional" v-else>{{ $t('common.optional') }}</span>
          </label>
          <div class="input-with-icon">
            <IconTicket class="input-icon" />
            <input 
              type="text" 
              id="inviteCode" 
              class="form-control" 
              v-model="formData.inviteCode" 
              :placeholder="$t('auth.inviteCodePlaceholder')"
              :required="config.is_invite_force === 1"
              :disabled="inviteCodeFromUrl"
              :readonly="inviteCodeFromUrl"
            />
          </div>
          <span v-if="errors.inviteCode" class="error-message">{{ errors.inviteCode }}</span>
        </div>
        
        <!-- 验证码组件 -->
        <div class="form-group" v-if="config.is_recaptcha === 1">
          <label class="form-label">{{ $t('auth.captcha') }} <span class="required">*</span></label>
          <div class="captcha-container">
            <!-- Google reCAPTCHA -->
            <div v-if="captchaConfig.type === 'google'" class="google-captcha" @click.stop>
              <div id="form-recaptcha"></div>
            </div>
            
            <!-- Cloudflare Turnstile -->
            <div v-else-if="captchaConfig.type === 'cloudflare'" class="cloudflare-captcha" @click.stop>
              <div id="form-turnstile"></div>
            </div>
          </div>
        </div>
        
        <div class="form-group agreement-checkbox">
          <label class="checkbox-container">
            <input type="checkbox" v-model="formData.agreeTerms" />
            <span class="checkmark"></span>
            <span class="checkbox-label">
              {{ $t('auth.agreeToTerms') }} 
              <a :href="config.tos_url || '#'" target="_blank" class="">{{ $t('auth.termsOfService') }}</a>
              <span class="required">*</span>
            </span>
          </label>
          <span v-if="errors.agreeTerms" class="error-message">{{ errors.agreeTerms }}</span>
        </div>
        
        <div class="form-group">
          <button 
            type="submit" 
            class="btn btn-primary btn-block" 
            :disabled="loading || !formData.agreeTerms"
          >
            <span v-if="loading" class="loading-wrapper">
              <span class="">{{ $t('common.loading') }}</span>
            </span>
            <span v-else class="">
              {{ $t('auth.createAccount') }}
              <IconArrowRight class="icon-right" />
            </span>
          </button>
        </div>
      </form>
      
      <div class="auth-footer">
        <div class="auth-divider">
          <span class="auth-divider-text">{{ $t('auth.alreadyHaveAccount') }}</span>
        </div>
        
        <router-link to="/login" class="btn btn-secondary btn-block">
          {{ $t('common.login') }}
        </router-link>
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
          <div v-if="captchaConfig.type === 'google'" class="google-captcha">
            <div id="modal-recaptcha"></div>
          </div>
          
          <!-- Cloudflare Turnstile -->
          <div v-else-if="captchaConfig.type === 'cloudflare'" class="cloudflare-captcha">
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
import { useToast } from '@/composables/useToast';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSelector from '@/components/common/LanguageSelector.vue';
import { isValidEmail } from '@/utils/validators';
import IconMail from '@/components/icons/IconMail.vue';
import IconCode from '@/components/icons/IconCode.vue';
import IconLock from '@/components/icons/IconLock.vue';
import IconTicket from '@/components/icons/IconTicket.vue';
import IconSend from '@/components/icons/IconSend.vue';
import IconArrowRight from '@/components/icons/IconArrowRight.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconEyeOff from '@/components/icons/IconEyeOff.vue';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import { register, checkLoginStatus, getWebsiteConfig, sendEmailVerify } from '@/api/auth';
import { applyDomainAuth } from '@/utils/licenseAuth';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import { CAPTCHA_CONFIG, AUTH_CONFIG } from '@/utils/baseConfig';
import AuthPopup from '@/components/auth/AuthPopup.vue';
import { shouldShowAuthPopup } from '@/utils/authPopupState';

// 添加全局回调函数
window.onCaptchaVerified = function(response) {
  // 使用全局变量访问组件实例
  if (window._registerInstance) {
    window._registerInstance.handleCaptchaResponse(response);
  }
};

// 添加验证码弹窗的全局回调函数
window.onCaptchaModalVerified = function(response) {
  // 使用全局变量访问组件实例
  if (window._registerInstance) {
    // 调用处理函数，它会保存响应并自动关闭弹窗
    window._registerInstance.handleCaptchaModalResponse(response);
  }
};

// 在组件外部定义一个全局变量来跟踪 reCAPTCHA 是否已渲染
let isGoogleRecaptchaRendered = false;

export default {
  name: 'RegisterView',
  components: {
    ThemeToggle,
    LanguageSelector,
    IconMail,
    IconCode,
    IconLock,
    IconTicket,
    IconSend,
    IconArrowRight,
    IconEye,
    IconEyeOff,
    IconChevronDown,
    DomainAuthAlert,
    AuthPopup
  },
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const { showToast } = useToast();
    
    const loading = ref(false);
    const configLoading = ref(true);
    const codeSent = ref(false);
    const cooldown = ref(0);
    const inviteCodeFromUrl = ref(false);
    
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
    
    // 网站配置
    const config = reactive({
      tos_url: '',
      is_email_verify: 0,
      is_invite_force: 0,
      email_whitelist_suffix: [],
      is_recaptcha: 0,
      recaptcha_site_key: '',
      app_description: '',
      app_url: ''
    });

    // 验证码配置
    const captchaConfig = reactive({
      type: CAPTCHA_CONFIG.captchaType,
      siteKey: '',
      verifyUrl: CAPTCHA_CONFIG[CAPTCHA_CONFIG.captchaType]?.verifyUrl || ''
    });

    // 验证码响应
    const captchaResponse = ref('');
    const app = getCurrentInstance();
    
    // 保存组件实例到全局，用于验证码回调
    if (app && app.proxy) {
      window._registerInstance = {
        handleCaptchaResponse: (response) => {
          captchaResponse.value = response;
        },
        handleCaptchaModalResponse: (response) => {
          // 增加更详细的日志以便调试
          // console.log('注册页面收到验证码响应:', {
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
            }, 100);
          }
        }
      };
    }
    
    // 邮箱部分
    const emailPrefix = ref('');
    const selectedSuffix = ref('');
    const showSuffixDropdown = ref(false);
    
    // 表单数据
    const formData = reactive({
      email: '',
      verificationCode: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
      agreeTerms: AUTH_CONFIG.autoAgreeTerms
    });
    
    const errors = reactive({
      email: '',
      verificationCode: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
      agreeTerms: ''
    });
    
    // 密码可见性
    const showPassword = ref(false);
    const showConfirmPassword = ref(false);

    // 检查是否需要在发送验证码时使用验证码弹窗
    const needCaptchaForEmailVerify = computed(() => {
      return config.is_recaptcha === 1;
    });

    // 获取网站配置
    const fetchWebsiteConfig = async () => {
      try {
        configLoading.value = true;
        const response = await getWebsiteConfig();
        if (response && response.data) {
          Object.assign(config, response.data);
          
          // 如果有邮箱后缀列表且不为空，则设置默认选中的后缀
          if (Array.isArray(config.email_whitelist_suffix) && config.email_whitelist_suffix.length > 0) {
            selectedSuffix.value = config.email_whitelist_suffix[0];
          }

          // 设置验证码配置
          if (config.is_recaptcha === 1) {
            captchaConfig.siteKey = config.recaptcha_site_key;
          }
        }
      } catch (error) {
        showToast(t('messages.configLoadFailed'), 'error');
      } finally {
        configLoading.value = false;
      }
    };

    // 点击空白处关闭下拉菜单
    const handleClickOutside = (event) => {
      const suffixDropdown = document.querySelector('.email-suffix');
      if (suffixDropdown && !suffixDropdown.contains(event.target)) {
        showSuffixDropdown.value = false;
      }
    };

    // 切换邮箱后缀下拉菜单
    const toggleSuffixDropdown = (event) => {
      event.stopPropagation();
      showSuffixDropdown.value = !showSuffixDropdown.value;
    };

    // 选择邮箱后缀
    const selectSuffix = (suffix) => {
      selectedSuffix.value = suffix;
      showSuffixDropdown.value = false;
      updateEmail();
    };

    // 更新完整邮箱
    const updateEmail = () => {
      if (emailPrefix.value && selectedSuffix.value) {
        formData.email = `${emailPrefix.value}@${selectedSuffix.value}`;
      } else {
        formData.email = emailPrefix.value;
      }
    };

    // 处理邮箱前缀输入变化
    const handleEmailPrefixChange = () => {
      updateEmail();
    };
    
    // 显示验证码弹窗
    const showCaptchaModalDialog = () => {
      showCaptchaModal.value = true;
      captchaModalResponse.value = '';
      
      // 确保每次打开弹窗时都重新加载验证码
      const renderModalCaptcha = async () => {
        // 延迟一点时间确保弹窗DOM已渲染
        setTimeout(() => {
          // 确保验证码组件已加载并渲染
          if (captchaConfig.type === 'google' && window.grecaptcha) {
            // 清除之前的实例
            const container = document.getElementById('modal-recaptcha');
            if (container) {
              container.innerHTML = '';
              
              // 创建新的验证码实例
              window.grecaptcha.render('modal-recaptcha', {
                'sitekey': captchaConfig.siteKey,
                'callback': 'onCaptchaModalVerified',
                'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light'
              });
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
                    // console.log('Turnstile直接回调接收到token');
                    if (window._registerInstance) {
                      window._registerInstance.handleCaptchaModalResponse(token);
                    }
                  },
                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                  'retry': 'auto', // 错误时自动重试
                  'retry-interval': 5000, // 重试间隔
                  'refresh-expired': 'manual', // 手动刷新过期的验证码，防止自动刷新
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
      };
      
      // 执行验证码渲染
      renderModalCaptcha();
    };
    
    // 关闭验证码弹窗
    const closeCaptchaModal = () => {
      isClosingModal.value = true;
      
      // 给动画时间完成
      setTimeout(() => {
        showCaptchaModal.value = false;
        isClosingModal.value = false;
      }, 300);
    };
    
    // 带验证码发送验证码
    const sendVerificationCodeWithCaptcha = async (captchaData) => {
      try {
        loading.value = true;
        
        // 执行验证码发送逻辑
        const sendData = {
          email: formData.email,
          // 添加忘记密码标记，该参数仅在Xiao-V2board面板类型下有效
          isForgetPassword: false
        };
        
        // 如果有验证码数据，添加到请求中
        if (captchaData) {
          sendData.recaptcha_data = captchaData;
        }
        
        // 调用发送验证码API
        const response = await sendEmailVerify(sendData);
        
        if (response && response.data === true) {
          codeSent.value = true;
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
    
    // 发送验证码前检查
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
      
      // 如果需要验证码验证且已配置验证码，始终显示验证码弹窗
      if (config.is_recaptcha === 1 && captchaConfig.siteKey) {
        showCaptchaModalDialog();
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
    
    // 表单验证
    const validateForm = () => {
      let isValid = true;
      
      // 重置错误
      errors.email = '';
      errors.verificationCode = '';
      errors.password = '';
      errors.confirmPassword = '';
      errors.inviteCode = '';
      errors.agreeTerms = '';
      
      // 如果未启用邮箱验证码，自动清空验证码输入，避免误校验
      if (config.is_email_verify !== 1) {
        formData.verificationCode = '';
      }
      
      // 验证邮箱
      if (!formData.email) {
        errors.email = t('auth.emailRequired');
        isValid = false;
      } else if (!isValidEmail(formData.email)) {
        errors.email = t('auth.emailInvalid');
        isValid = false;
      }
      
      // 验证验证码 (仅当需要邮箱验证时)
      if (config.is_email_verify === 1) {
        if (!formData.verificationCode) {
          errors.verificationCode = t('auth.codeRequired');
          isValid = false;
        }
      }
      
      // 验证密码
      if (!formData.password) {
        errors.password = t('auth.passwordRequired');
        isValid = false;
      } else if (formData.password.length < 8) {
        errors.password = t('auth.passwordTooShort');
        isValid = false;
      }
      
      // 验证确认密码
      if (!formData.confirmPassword) {
        errors.confirmPassword = t('auth.confirmPasswordRequired');
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = t('auth.passwordsDoNotMatch');
        isValid = false;
      }
      
      // 验证邀请码 (仅当强制邀请码时)
      if (config.is_invite_force === 1 && !formData.inviteCode) {
        errors.inviteCode = t('auth.inviteCodeRequired');
        isValid = false;
      }
      
      // 验证是否同意条款
      if (!formData.agreeTerms) {
        errors.agreeTerms = t('auth.mustAgreeToTerms');
        isValid = false;
      }

      // 验证人机验证 - 修改验证逻辑，始终检查验证状态
      if (config.is_recaptcha === 1) {
        // 获取表单中的验证码响应（这是注册时使用的验证码）
        const formCaptchaElement = document.querySelector('[name="g-recaptcha-response"]') || 
                                 document.querySelector('[name="cf-turnstile-response"]');
        
        const isCaptchaVerified = !!formCaptchaElement?.value || !!captchaResponse.value;
        
        if (!isCaptchaVerified) {
          showToast(t('auth.captchaRequired'), 'error');
          isValid = false;
        }
      }
      
      return isValid;
    };
    
    // 处理注册
    const handleRegister = async () => {
      if (!validateForm()) return;
      
      try {
        loading.value = true;
        
        // 构建注册数据
        const registerData = {
          email: formData.email,
          password: formData.password
        };
        
        // 仅当需要邮箱验证时添加验证码
        if (config.is_email_verify === 1) {
          registerData.email_code = parseInt(formData.verificationCode);
        }
        
        // 添加邀请码 (如果有)
        if (formData.inviteCode) {
          registerData.invite_code = formData.inviteCode;
        }
        
        // 如果需要人机验证，添加验证数据
        if (config.is_recaptcha === 1) {
          // 从DOM中获取表单中的验证码响应
          const formCaptchaElement = document.querySelector('[name="g-recaptcha-response"]') || 
                                   document.querySelector('[name="cf-turnstile-response"]');
          
          if (formCaptchaElement && formCaptchaElement.value) {
            registerData.recaptcha_data = formCaptchaElement.value;
          } else if (captchaResponse.value) {
            // 如果从DOM获取失败，使用保存的响应
            registerData.recaptcha_data = captchaResponse.value;
          }
        }
        
        // 调用注册API
        const response = await register(registerData);
        
        // 注册成功
        showToast(response.message || t('auth.registerSuccess'), 'success');
        
        // 延迟跳转到仪表盘，确保消息能够显示
        setTimeout(() => {
          router.push('/dashboard');
        }, 300);
      } catch (error) {
        showToast(error.response?.message || error.message || t('auth.registerFailed'), 'error');
        // 重置验证码
        if (window.grecaptcha) {
          window.grecaptcha.reset();
        }
      } finally {
        loading.value = false;
      }
    };
    
    // 检查登录状态
    onMounted(() => {
      // 应用域名授权验证
      authStatus.value = applyDomainAuth();
      
      // 从URL参数中获取登出状态
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      
      if (urlParams.has('logout') === true || hashParams.has('logout') === true) {
        // console.log('检测到用户刚刚登出，清除所有登录状态');
        // 显示登出成功的提示
        showToast(t('auth.logoutSuccess'), 'success');
        
        // 清除URL中的logout参数，防止页面刷新后再次触发
        if (window.history && window.history.replaceState) {
          const newUrl = window.location.href.replace('?logout=true', '').replace('&logout=true', '');
          window.history.replaceState({}, document.title, newUrl);
        }
        
        // 获取网站配置但不检查登录状态
        fetchWebsiteConfig();
        document.addEventListener('click', handleClickOutside);
        return;
      }
      
      try {
        // 检查全局登出标记
        if (window._isLoggingOut === true) {
          // console.log('检测到全局登出标记，跳过登录状态检查');
          fetchWebsiteConfig();
          document.addEventListener('click', handleClickOutside);
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
          return;
        }
        
        // 未登录状态，尝试获取邀请码
        if (urlParams.has('code')) {
          formData.inviteCode = urlParams.get('code');
          inviteCodeFromUrl.value = true;
        } else if (hashParams.has('code')) {
          formData.inviteCode = hashParams.get('code');
          inviteCodeFromUrl.value = true;
        } else {
          // 尝试从 URL 的任意部分查找 code 参数
          const fullUrl = window.location.href;
          const codeMatch = fullUrl.match(/[?&]code=([^&]+)/);
          if (codeMatch && codeMatch[1]) {
            formData.inviteCode = codeMatch[1];
            inviteCodeFromUrl.value = true;
          }
        }
      } catch (error) {
        // console.error("登录状态检查失败", error);
      }
      
      // 无论如何都加载配置
      fetchWebsiteConfig().then(() => {
        // 如果需要验证码，加载对应的脚本
        if (config.is_recaptcha === 1) {
          loadCaptchaScript();
        }
        
        // 初始化自定义弹窗，使用状态管理确保同一会话只显示一次
        showAuthPopup.value = shouldShowAuthPopup(AUTH_CONFIG.popup);
      });
      
      document.addEventListener('click', handleClickOutside);
      
      // 添加额外事件监听器，处理路由返回时重新加载验证码
      window.addEventListener('focus', () => {
        if (config.is_recaptcha === 1) {
          setTimeout(() => {
            renderFormCaptcha();
          }, 300);
        }
      });
    });
    
    // 当组件被keep-alive激活时调用
    onActivated(() => {
      // 如果配置已加载且需要验证码，重新初始化Cloudflare Turnstile
      if (config.is_recaptcha === 1 && captchaConfig.type === 'cloudflare' && captchaConfig.siteKey) {
        console.log('注册组件激活，重新加载Cloudflare Turnstile验证组件');
        loadCaptchaScript().then(() => {
          // 清理旧的Turnstile验证码实例
          if (window.turnstile && window.turnstile.reset) {
            // 尝试通过reset方法重置验证码，如果可能的话
            try {
              // 重置所有验证码
              window.turnstile.reset();
              
              // 重新渲染表单中的验证码
              const formContainer = document.getElementById('form-turnstile');
              if (formContainer && window.turnstile.render) {
                formContainer.innerHTML = '';
                
                // 重新渲染表单中的验证码
                window.turnstile.render('#form-turnstile', {
                  'sitekey': captchaConfig.siteKey,
                  'callback': function(token) {
                    // console.log('表单验证码收到token');
                    if (window._registerInstance) {
                      window._registerInstance.handleCaptchaResponse(token);
                    }
                  },
                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                  'retry': 'auto', // 错误时自动重试
                  'retry-interval': 5000, // 重试间隔
                  'refresh-expired': 'manual', // 手动刷新过期的验证码，防止自动刷新
                  'tabindex': 0, // 改善无障碍访问
                  // 防止自动刷新和点击外部区域错误
                  'execution': 'render' // 在渲染时执行，而非等待用户交互
                });
              }
            } catch (e) {
              console.log('Turnstile重置失败，将重新渲染验证码组件', e);
              // 如果重置失败，尝试重新加载脚本
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
          }
        });
      }
    });
    
    // 组件卸载前移除事件监听器和验证码脚本
    onBeforeUnmount(() => {
      document.removeEventListener('click', handleClickOutside);
      
      // 重置 reCAPTCHA 标志
      isGoogleRecaptchaRendered = false;
      
      // 使用 Turnstile 的正式 API 方法重置验证码实例
      if (window.turnstile && window.turnstile.reset) {
        try {
          window.turnstile.reset();
        } catch (e) {
          console.log('Turnstile重置失败', e);
        }
      }
      
      // 清除验证码容器内容而不是移除脚本
      const formTurnstileContainer = document.getElementById('form-turnstile');
      if (formTurnstileContainer) {
        formTurnstileContainer.innerHTML = '';
      }
      
      const modalTurnstileContainer = document.getElementById('modal-turnstile');
      if (modalTurnstileContainer) {
        modalTurnstileContainer.innerHTML = '';
      }
      
      // 重置状态变量
      captchaResponse.value = '';
      captchaModalResponse.value = '';
      
      // 不要移除全局验证码对象，只清理回调
      window.captchaScriptLoaded = undefined;
      window.onCaptchaVerified = undefined;
      window.onCaptchaModalVerified = undefined;
      
      // 清理全局引用
      window._registerInstance = null;
    });
    
    // 处理验证码响应的函数
    const handleCaptchaResponse = (response) => {
      captchaResponse.value = response;
    };
    
    // 处理验证码弹窗的验证响应
    const handleCaptchaModalResponse = (response) => {
      // 增加更详细的日志以便调试
      // console.log('注册页面收到验证码响应:', {
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
        }, 100);
      }
    };
    
    // 在组件挂载后渲染表单中的验证码
    const renderFormCaptcha = () => {
      if (config.is_recaptcha !== 1 || !captchaConfig.siteKey) {
        return;
      }
      
      setTimeout(() => {
        // 确保验证码组件存在
        if (captchaConfig.type === 'google' && window.grecaptcha) {
          const container = document.getElementById('form-recaptcha');
          if (container && !isGoogleRecaptchaRendered) {
            // 清空容器
            container.innerHTML = '';
            
            try {
              // 创建新的实例
              window.grecaptcha.render('form-recaptcha', {
                'sitekey': captchaConfig.siteKey,
                'callback': function(token) {
                  if (window._registerInstance) {
                    window._registerInstance.handleCaptchaResponse(token);
                  }
                },
                'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light'
              });
              isGoogleRecaptchaRendered = true;
            } catch (error) {
              console.error('Google reCAPTCHA渲染错误:', error);
              // 如果是已渲染的错误，继续将标记设为 true，否则重置为 false 以便下次尝试
              if (error.toString().includes('has already been rendered')) {
                isGoogleRecaptchaRendered = true;
              } else {
                isGoogleRecaptchaRendered = false;
              }
            }
          }
        } else if (captchaConfig.type === 'cloudflare' && window.turnstile) {
          const container = document.getElementById('form-turnstile');
          if (container) {
            // 清空容器
            container.innerHTML = '';
            
            try {
              // 创建新的实例
              window.turnstile.render('#form-turnstile', {
                'sitekey': captchaConfig.siteKey,
                'callback': function(token) {
                  // console.log('表单验证码收到token');
                  if (window._registerInstance) {
                    window._registerInstance.handleCaptchaResponse(token);
                  }
                },
                'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                'retry': 'auto', // 错误时自动重试
                'retry-interval': 5000, // 重试间隔
                'refresh-expired': 'manual', // 手动刷新过期的验证码，防止自动刷新
                'tabindex': 0, // 改善无障碍访问
                // 防止自动刷新和点击外部区域错误
                'execution': 'render' // 在渲染时执行，而非等待用户交互
              });
            } catch (error) {
              console.error('表单验证码渲染错误:', error);
            }
          }
        }
      }, 500); // 给DOM足够的时间渲染
    };
    
    // 加载验证码脚本
    const loadCaptchaScript = () => {
      return new Promise((resolve) => {
        if (config.is_recaptcha !== 1 || !config.recaptcha_site_key) {
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
            const formContainer = document.getElementById('form-turnstile');
            if (formContainer) {
              // 清空容器并重新渲染
              formContainer.innerHTML = '';
              
              // 延迟一点时间确保DOM已更新
              setTimeout(() => {
                // 重新渲染表单验证码
                window.turnstile.render('#form-turnstile', {
                  'sitekey': captchaConfig.siteKey,
                  'callback': 'onCaptchaVerified',
                  'theme': document.body.classList.contains('dark-theme') ? 'dark' : 'light',
                  'refresh-expired': 'auto'
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
          const recaptchaContainer = document.getElementById('form-recaptcha');
          if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '';
          }
          
          const turnstileContainer = document.getElementById('form-turnstile');
          if (turnstileContainer) {
            turnstileContainer.innerHTML = '';
          }
          
          // 清除弹窗中的验证码容器
          const modalRecaptchaContainer = document.getElementById('modal-recaptcha');
          if (modalRecaptchaContainer) {
            modalRecaptchaContainer.innerHTML = '';
          }
          
          const modalTurnstileContainer = document.getElementById('modal-turnstile');
          if (modalTurnstileContainer) {
            modalTurnstileContainer.innerHTML = '';
          }
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
            renderFormCaptcha();
            setTimeout(() => {
              resolve();
            }, 100);
          };
          
          document.head.appendChild(script);
        } else {
          // 如果已存在脚本但重置失败，直接渲染
          renderFormCaptcha();
          resolve();
        }
      });
    };
    
    return {
      formData,
      errors,
      loading,
      configLoading,
      codeSent,
      cooldown,
      sendVerificationCode,
      handleRegister,
      isValidEmail,
      showPassword,
      showConfirmPassword,
      config,
      emailPrefix,
      selectedSuffix,
      showSuffixDropdown,
      toggleSuffixDropdown,
      selectSuffix,
      handleEmailPrefixChange,
      inviteCodeFromUrl,
      authStatus,
      logoPath,
      handleLogoError,
      captchaConfig,
      handleCaptchaResponse,
      showCaptchaModal,
      closeCaptchaModal,
      handleCaptchaModalResponse,
      needCaptchaForEmailVerify,
      isClosingModal,
      renderFormCaptcha,
      // 自定义弹窗相关
      showAuthPopup,
      authPopupConfig,
      handleAuthPopupClose
    };
  }
};
</script>

<style lang="scss" scoped>
.top-toolbar {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 10;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  
  .loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(var(--theme-color-rgb), 0.2);
    border-radius: 50%;
    border-top-color: var(--theme-color);
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.required {
  color: var(--error-color, #ff4d4f);
  margin-left: 4px;
  font-size: 16px;
  vertical-align: middle;
}

.optional {
  color: var(--text-muted, #999);
  margin-left: 4px;
  font-size: 12px;
  font-weight: normal;
  vertical-align: baseline;
}

// 邮箱后缀选择器
.input-with-suffix {
  display: flex;
  align-items: stretch;
  width: 100%;
  border-radius: 8px;
  background-color: var(--input-bg-color, #f9f9f9);
  border: 1px solid var(--input-border-color, transparent);
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background-color: var(--input-hover-bg-color, #f5f5f5);
  }
  
  &:focus-within {
    border-color: var(--theme-color);
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
    background-color: var(--input-focus-bg-color, #fff);
  }
  
  .email-prefix {
    flex: 1;
    margin: 0;
    
    .form-control {
      border: none;
      border-radius: 8px 0 0 8px;
      height: 45px;
      font-size: 14px;
      letter-spacing: 0.2px;
      background-color: transparent;
      
      &:focus {
        box-shadow: none;
      }
    }
  }
  
  .email-suffix-separator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    color: var(--secondary-text-color);
    font-size: 14px;
    background-color: transparent;
    opacity: 0.8;
  }
  
  .email-suffix {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 12px;
    min-width: 130px;
    cursor: pointer;
    border-left: 1px solid var(--input-border-color, rgba(0, 0, 0, 0.08));
    background-color: transparent;
    transition: all 0.3s ease;
    border-radius: 0 8px 8px 0;
    
    &.disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    &:hover:not(.disabled) {
      background-color: var(--input-hover-bg-color, #f5f5f5);
    }
    
    .suffix-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color);
      font-size: 14px;
      padding: 0 4px;
      font-weight: 500;
    }
    
    .suffix-icon {
      width: 16px;
      height: 16px;
      margin-left: 8px;
      transition: transform 0.3s ease;
      color: var(--secondary-text-color);
      opacity: 0.8;
      
      &.rotate-180 {
        transform: rotate(180deg);
      }
    }
    
    .suffix-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: -1px;
      right: -1px;
      background-color: var(--card-background);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 100;
      max-height: 240px;
      overflow-y: auto;
      animation: dropdownFadeIn 0.2s ease;
      border: 1px solid var(--input-border-color, rgba(0, 0, 0, 0.08));
      min-width: 160px;
      
      // 自定义滚动条样式
      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      &::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }
      
      &::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.2));
        border-radius: 3px;
        
        &:hover {
          background-color: var(--scrollbar-thumb-hover-color, rgba(0, 0, 0, 0.3));
        }
      }
      
      .suffix-option {
        padding: 10px 16px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--primary-text-color);
        font-size: 14px;
        display: flex;
        align-items: center;
        
        &:hover, &.active {
          background-color: rgba(var(--theme-color-rgb), 0.1);
          color: var(--theme-color);
        }
        
        &:first-child {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        
        &:last-child {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
      }
    }
  }
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
      box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
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
    background-color: var(--theme-color);
    color: white;
    margin: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.3s, opacity 0.3s, transform 0.3s;
    
    &:hover:not(:disabled) {
      background-color: var(--primary-color-hover);
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
  
  &.btn-secondary {
    position: relative;
    overflow: hidden;
    
    &.btn-block {
      transition: all 0.3s ease;
      
      &:hover {
        color: var(--theme-color) !important;
        border-color: var(--theme-color) !important;
        background-color: rgba(var(--theme-color-rgb), 0.05) !important;
        -webkit-text-fill-color: var(--theme-color) !important;
        background-image: none !important;
      }
    }
  }
}

.agreement-checkbox {
  margin-top: 1.5rem;
  
  .checkbox-container {
    display: flex;
    align-items: flex-start;
    position: relative;
    padding-left: 30px;
    cursor: pointer;
    font-size: 0.9rem;
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
      line-height: 1.5;
      
      a {
        position: relative;
        color: var(--theme-color);
        text-decoration: none;
        background: linear-gradient(90deg, var(--theme-color) 0%, var(--theme-hover-color, #4bc8a2) 100%);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        transition: all 0.3s ease-in-out;
        
        &:hover {
          background-position: 100% 0;
        }
      }
    }
  }
}

.error-message {
  display: block;
  color: var(--error-color, #ff4d4f);
  font-size: 0.8rem;
  margin-top: 0.3rem;
}

/* 移动设备适配 */
@media (max-width: 576px) {
  .auth-card {
    padding: 1.5rem;
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
  
  .input-with-button {
    flex-direction: row;
    height: 45px;
    gap: 0;
    
    .verification-input .form-control {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    
    .send-code-btn {
      width: auto;
      min-width: 100px;
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
      height: 100%;
    }
  }
}

/* 平板设备适配 */
@media (min-width: 576px) and (max-width: 992px) {
  .auth-container {
    padding: 2rem;
  }
}

/* 深色模式适配 */
.dark-theme {
  .loading-container .loading-spinner {
    color: var(--theme-color);
  }
  
  .input-with-suffix {
    background-color: var(--input-bg-color, #333);
    border-color: var(--input-border-color, #444);
    
    &:hover {
      background-color: var(--input-hover-bg-color, #383838);
    }
    
    &:focus-within {
      border-color: var(--theme-color);
      background-color: var(--input-focus-bg-color, #3a3a3a);
    }
    
    .email-suffix {
      border-left-color: var(--input-border-color, #444);
      
      &:hover:not(.disabled) {
        background-color: var(--input-hover-bg-color, #383838);
      }
      
      .suffix-dropdown {
        background-color: var(--card-background);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border-color: var(--input-border-color, #444);
        
        &:before {
          background-color: var(--card-background);
          border-color: var(--input-border-color, #444);
        }
        
        .suffix-option {
          &:hover {
            background-color: rgba(var(--theme-color-rgb), 0.15);
          }
        }
      }
    }
  }
  
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
  
  .checkbox-container {
    .checkbox-label {
      color: var(--secondary-text-color);
    }
    
    .checkmark {
      background-color: transparent;
      border-color: var(--border-color, #555);
    }
  }
  
  .btn-primary {
    background-color: var(--theme-color);
    
    &:hover:not(:disabled) {
      background-color: var(--primary-color-hover);
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

// 修改页面切换过渡动画
.auth-card {
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.auth-logo {
  margin-bottom: 1.5rem;
  text-align: center;
  
  img {
    width: 60px;
    height: 60px;
    min-width: 60px;
    min-height: 60px;
    border-radius: 12px;
    object-fit: cover;
  }
}

.captcha-container {
  display: flex;
  justify-content: center;
  margin: 10px 0;
  
  .google-captcha,
  .cloudflare-captcha {
    display: flex;
    justify-content: center;
    margin: 10px 0;
    min-height: 78px;
    
    #form-recaptcha,
    #form-turnstile {
      display: inline-block;
      min-width: 302px;
      min-height: 78px;
    }
  }
}

/* 验证码弹窗样式 */
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
  opacity: 1;
  transition: opacity 0.3s ease;
  
  &.closing {
    opacity: 0;
  }
  
  .captcha-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
  }
  
  .captcha-modal-content {
    position: relative;
    width: 100%;
    max-width: 420px;
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    z-index: 1001;
    overflow: hidden;
    animation: modalFadeIn 0.3s ease;
    transform: translateY(0);
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 1;
    
    &.closing {
      transform: translateY(-20px);
      opacity: 0;
    }
    
    .captcha-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        color: var(--secondary-text-color);
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        
        &:hover {
          color: var(--primary-text-color);
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
        margin: 15px 0;
        min-height: 78px;
        
        #modal-recaptcha,
        #modal-turnstile {
          display: inline-block;
          min-width: 302px;
          min-height: 78px;
        }
      }
    }
  }
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 