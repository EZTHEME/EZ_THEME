<template>
  <div class="custom-landing-container">
    <!-- 全屏加载动画 -->
    <div
      v-if="shouldShowPreloader"
      class="preloader"
      :class="{'fade-out': isLoaded}"
      ref="preloader"
      :style="preloaderStyle"
    >
      <div class="loader" :style="loaderStyle"></div>
    </div>

    <!-- 域名授权验证提示 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <!-- iframe用于加载自定义landing页面 -->
    <iframe 
      v-if="authStatus.isAuthorized && customLandingPath" 
      :src="customLandingPath" 
      class="custom-landing-iframe"
      ref="landingIframe"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      @load="handleIframeLoaded"
    ></iframe>
    
    <!-- 如果没有授权码或未指定自定义landing页，显示默认landing页 -->
    <div v-else>
      <LandingPage @loaded="handleContentLoaded" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { SITE_CONFIG, THEME_CONFIG, DEFAULT_CONFIG } from '@/utils/baseConfig';
import { applyDomainAuth } from '@/utils/licenseAuth';
import { verifyLicense } from '@/utils/licenseAuth';
import { useTheme } from '@/composables/useTheme';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import LandingPage from './LandingPage.vue';

export default {
  name: 'CustomLandingPage',
  components: {
    DomainAuthAlert,
    LandingPage
  },
  setup() {
    const router = useRouter();
    const landingIframe = ref(null);
    const preloader = ref(null);
    const isLoaded = ref(false);
    
    // 获取主题功能
    const { theme, toggleTheme } = useTheme();
    
    // 域名授权状态
    const authStatus = ref({
      isAuthorized: true,
      apiDomain: ''
    });
    
    // 基于当前主题计算预加载器样式
    const preloaderStyle = computed(() => {
      const themeColors = THEME_CONFIG[theme.value];
      return {
        backgroundColor: themeColors.backgroundColor
      };
    });
    
    // 基于当前主题计算加载器样式
    const loaderStyle = computed(() => {
      const themeColors = THEME_CONFIG[theme.value];
      const primaryColor = themeColors.primaryColor || DEFAULT_CONFIG.primaryColor;
      const primaryRgb = themeColors.primaryColorRgb;
      
      // 使用更鲜明的颜色，而不是半透明的浅色
      return {
        '--loader-primary-color': primaryColor,
        '--loader-primary-rgb': primaryRgb,
        '--loader-primary-light': primaryColor, // 使用相同的主色，不再使用半透明的浅色
      };
    });
    
    // 处理从iframe接收到的消息
    const handleIframeMessage = (event) => {
      // 检查消息类型
      if (event.data && event.data.type === 'navigation') {
        // 使用Vue Router导航到指定路由
        router.push('/' + event.data.route);
      } 
      // 处理主题变更消息
      else if (event.data && event.data.type === 'themeChanged') {
        // 接收从landing page发来的主题变更请求，同步到应用主题
        if (theme.value !== event.data.theme) {
          // 使用toggleTheme切换主题，无需直接设置theme.value
          toggleTheme();
        }
      }
      // 处理获取主题请求
      else if (event.data && event.data.type === 'getTheme') {
        // 向iframe发送当前主题信息
        sendThemeToIframe();
      }
    };
    
    // 向iframe发送主题信息
    const sendThemeToIframe = () => {
      if (landingIframe.value && landingIframe.value.contentWindow) {
        landingIframe.value.contentWindow.postMessage({
          type: 'setTheme',
          theme: theme.value
        }, '*');
      }
    };
    
    // 监听应用主题变化，同步到iframe
    watch(theme, () => {
      sendThemeToIframe();
    });
    
    // iframe加载完成处理
    const handleIframeLoaded = () => {
      // 延迟隐藏加载动画，确保iframe内容已渲染
      setTimeout(() => {
        hidePreloader();
      }, 500);
    };
    
    // 默认页面加载完成处理
    const handleContentLoaded = () => {
      hidePreloader();
    };
    
    const PRELOADER_KEY = 'ez_preloader_shown';
    const shouldShowPreloader = ref(sessionStorage.getItem(PRELOADER_KEY) !== '1');

    const hidePreloader = () => {
      isLoaded.value = true;
      sessionStorage.setItem(PRELOADER_KEY, '1');
      shouldShowPreloader.value = false;
    };
    
    // 检查授权状态并设置消息监听器
    onMounted(async () => {
      // 如果已经加载过，直接隐藏
      if (sessionStorage.getItem(PRELOADER_KEY) === '1') {
        isLoaded.value = true;
        if (preloader.value) preloader.value.style.display = 'none';
      }
      
      // 域名授权校验
      authStatus.value = await applyDomainAuth();

      // 授权码验证
      const licenseResult = await verifyLicense();
      if (!licenseResult.isAuthorized) {
        authStatus.value.isAuthorized = false;
        authStatus.value.apiDomain = licenseResult.message;
      }
      
      // 添加消息事件监听器
      window.addEventListener('message', handleIframeMessage);
      
      // 等待iframe加载完成，然后发送主题信息
      if (landingIframe.value) {
        landingIframe.value.onload = () => {
          // 延迟发送主题信息，确保iframe已完全加载
          setTimeout(() => {
            sendThemeToIframe();
          }, 500);
        };
      }
      
      // 如果5秒内内容未加载完成，也隐藏加载动画
      setTimeout(() => {
        if (!isLoaded.value) {
          hidePreloader();
        }
      }, 5000);
    });
    
    // 组件卸载前移除事件监听器
    onBeforeUnmount(() => {
      window.removeEventListener('message', handleIframeMessage);
    });
    
    // 获取自定义landing页面路径
    const customLandingPath = computed(() => {
      if (!SITE_CONFIG.customLandingPage) return '';
      
      // 路由阶段已判断存在自定义页面，这里仅处理路径格式
      // 返回完整路径，确保正确处理相对路径
      // 处理路径，确保它是相对于根目录的
      let path = SITE_CONFIG.customLandingPage;
      
      // 如果路径不是以/、http://或https://开头，则添加/前缀
      if (!path.startsWith('/') && !path.startsWith('http://') && !path.startsWith('https://')) {
        path = '/' + path;
      }
      
      return path;
    });
    
    return {
      authStatus,
      customLandingPath,
      landingIframe,
      preloader,
      isLoaded,
      handleIframeLoaded,
      handleContentLoaded,
      preloaderStyle,
      loaderStyle,
      shouldShowPreloader
    };
  }
};
</script>

<style lang="scss" scoped>
.custom-landing-container {
  width: 100%;
}

.custom-landing-iframe {
  width: 100%;
  height: 100%;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
}

/* 加载动画样式 */
.preloader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity 0.8s ease, visibility 0.8s ease;
}

.preloader.fade-out {
  opacity: 0;
  visibility: hidden;
}

.loader {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border-top-color: var(--loader-primary-color);
  animation: spin 1s ease-in-out infinite;
  position: relative;
}

.loader::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border: 3px solid transparent;
  border-bottom-color: var(--loader-primary-light);
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style> 