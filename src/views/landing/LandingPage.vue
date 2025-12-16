<template>
  <div class="landing-page" :class="{ 'dark-theme': isDarkTheme }" @wheel="handleWheel" @scroll="handleScroll" ref="landingPageRef">
    <!-- 域名授权验证提示 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="bg-circle circle-1" :class="{ 'dark-mode': isDarkTheme }"></div>
      <div class="bg-circle circle-2" :class="{ 'dark-mode': isDarkTheme }"></div>
      <div class="bg-circle circle-3" :class="{ 'dark-mode': isDarkTheme }"></div>
    </div>
    
    <!-- 顶部工具栏 -->
    <div class="top-toolbar">
      <ThemeToggle />
      <LanguageSelector />
    </div>
    
    <!-- 中央内容区 -->
    <div class="content-container">
      <div class="site-title">
        <img v-if="siteConfig.showLogo" src="/images/logo.png" alt="Logo" class="site-logo-img" />
        {{ siteConfig.siteName }}
      </div>
      <div class="landing-text">{{ $t('landing.mainText') }}</div>
    </div>
    
    <!-- 底部箭头 -->
    <div class="scroll-arrow-container" @click="navigateToLogin">
      <div class="scroll-arrow">
        <IconChevronDown :size="32" :stroke-width="1.5" />
      </div>
      <div class="scroll-text">{{ $t('landing.scrollText') }}</div>
    </div>
    
    <!-- 页面过渡遮罩 -->
    <div class="page-transition-mask" :class="{ 'active': isTransitioning }"></div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { SITE_CONFIG, DEFAULT_CONFIG } from '@/utils/baseConfig';
import { applyDomainAuth } from '@/utils/licenseAuth';
import ThemeToggle from '@/components/common/ThemeToggle.vue';
import LanguageSelector from '@/components/common/LanguageSelector.vue';
import { IconChevronDown } from '@tabler/icons-vue';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';

export default {
  name: 'LandingPage',
  components: {
    ThemeToggle,
    LanguageSelector,
    IconChevronDown,
    DomainAuthAlert
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const { t } = useI18n();
    const landingPageRef = ref(null);
    
    // 获取主题状态
    const isDarkTheme = computed(() => store.getters.currentTheme === 'dark');
    
    // 网站配置
    const siteConfig = ref(SITE_CONFIG);
    const defaultConfig = ref(DEFAULT_CONFIG);
    
    // 过渡状态
    const isTransitioning = ref(false);
    
    // 域名授权状态
    const authStatus = ref({
      isAuthorized: true,
      apiDomain: ''
    });
    
    // 滚动处理 - 只在 LandingPage 组件内部生效
    const handleScroll = (e) => {
      // 确保事件来自组件内部
      if (e.currentTarget === landingPageRef.value && window.scrollY > 100) {
        navigateToLogin();
      }
    };
    
    // 滚轮处理 - 只在 LandingPage 组件内部生效
    const handleWheel = (e) => {
      // 确保事件来自组件内部
      if (e.currentTarget === landingPageRef.value && e.deltaY > 0) {
        navigateToLogin();
      }
    };
    
    // 导航到登录页
    const navigateToLogin = () => {
      // 添加“状态锁”，防止函数在高频事件中重复执行
      if (isTransitioning.value) {
        return;
      }

      // 添加过渡效果
      isTransitioning.value = true;
      
      // 添加全局过渡类
      document.body.classList.add('page-transitioning');
      
      // 使用t函数记录日志
      console.log(t('landing.navigatingToLogin', 'Navigating to login page'));
      
      // 延迟导航，等待过渡效果完成
      setTimeout(() => {
        router.push('/login');
      }, 600); // 与CSS过渡时间匹配
    };
    
    // 触摸事件处理函数
    let touchStartY = 0;
    let handleTouchStart, handleTouchMove;
    
    onMounted(() => {
      // 应用域名授权验证
      authStatus.value = applyDomainAuth();
      
      // 添加触摸事件监听（移动端）- 使用组件引用确保只在 LandingPage 组件内部生效
      handleTouchStart = (e) => {
        // 确保事件来自组件内部
        if (e.currentTarget === landingPageRef.value || landingPageRef.value.contains(e.target)) {
          touchStartY = e.touches[0].clientY;
        }
      };
      
      handleTouchMove = (e) => {
        // 确保事件来自组件内部
        if (e.currentTarget === landingPageRef.value || landingPageRef.value.contains(e.target)) {
          const touchY = e.touches[0].clientY;
          if (touchStartY - touchY > 50) { // 向上滑动超过50px
            navigateToLogin();
          }
        }
      };
      
      // 使用组件引用添加事件监听
      if (landingPageRef.value) {
        landingPageRef.value.addEventListener('touchstart', handleTouchStart, { passive: true });
        landingPageRef.value.addEventListener('touchmove', handleTouchMove, { passive: true });
      }
    });
    
    onUnmounted(() => {
      // 移除事件监听 - 使用组件引用确保只移除 LandingPage 组件内部的事件监听
      if (landingPageRef.value) {
        landingPageRef.value.removeEventListener('touchstart', handleTouchStart);
        landingPageRef.value.removeEventListener('touchmove', handleTouchMove);
      }
    });
    
    return {
      landingPageRef,
      siteConfig,
      defaultConfig,
      isDarkTheme,
      isTransitioning,
      navigateToLogin,
      handleScroll,
      handleWheel,
      authStatus
    };
  }
};
</script>

<style lang="scss" scoped>
.landing-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--background-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 背景装饰 */
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  
  // iOS设备上完全隐藏背景装饰
  @supports (-webkit-touch-callout: none) {
    display: none;
  }
  
  .bg-circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4; /* 降低默认不透明度 */
    animation: float 20s infinite ease-in-out;
    transition: opacity 0.5s ease, background-color 0.5s ease;
    
    // iOS设备降低模糊效果和不透明度
    @supports (-webkit-touch-callout: none) {
      filter: blur(20px);
      opacity: 0.15;
      animation-duration: 40s; // 减慢动画速度以降低GPU负担
    }
    
    &.dark-mode {
      opacity: 0.25; /* 深色模式下更低的不透明度 */
      filter: blur(100px) saturate(0.7); /* 深色模式下增加模糊并降低饱和度 */
      
      // iOS设备在深色模式下进一步降低效果
      @supports (-webkit-touch-callout: none) {
        filter: blur(15px) saturate(0.5);
        opacity: 0.1;
      }
    }
  }
  
  .circle-1 {
    width: 600px;
    height: 600px;
    background: var(--theme-color);
    top: -10%;
    left: -10%;
    animation-duration: 25s;
    
    &.dark-mode {
      background: rgba(0, 148, 124, 0.6); /* 深色模式下调整颜色 */
    }
  }
  
  .circle-2 {
    width: 500px;
    height: 500px;
    background: #A747FE;
    top: 40%;
    right: -5%;
    animation-duration: 30s;
    
    &.dark-mode {
      background: rgba(167, 71, 254, 0.5); /* 深色模式下调整颜色 */
    }
  }
  
  .circle-3 {
    width: 450px;
    height: 450px;
    background: #37DEC9;
    bottom: -10%;
    left: 20%;
    animation-duration: 35s;
    
    &.dark-mode {
      background: rgba(55, 222, 201, 0.5); /* 深色模式下调整颜色 */
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(5%, 5%) rotate(5deg);
  }
  50% {
    transform: translate(0, 10%) rotate(0deg);
  }
  75% {
    transform: translate(-5%, 5%) rotate(-5deg);
  }
}

/* 顶部工具栏 */
.top-toolbar {
  position: fixed;
  top: 20px;
  right: 25px;
  display: flex;
  gap: 12px;
  z-index: 100;
}

/* 内容区 */
.content-container {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 0 20px;
  max-width: 800px;
}

.site-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
  background: linear-gradient(to right, var(--theme-color), #a78bfa);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-align: center;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  
  .site-logo-img {
    height: 40px;
    width: 40px;
    border-radius: 10px;
    object-fit: cover;
  }
}

.landing-text {
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.5;
  margin-bottom: 2rem;
  color: var(--text-color);
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
}

/* 底部箭头 */
.scroll-arrow-container {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateX(-50%) translateY(5px);
    
    .scroll-arrow {
      animation-play-state: paused;
    }
  }
}

.scroll-arrow {
  color: var(--theme-color);
  animation: bounce 2s infinite;
  margin-bottom: 8px;
}

.scroll-text {
  font-size: 0.875rem;
  color: var(--secondary-text-color);
  opacity: 0.8;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}

/* 页面过渡遮罩 */
.page-transition-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.active {
    opacity: 1;
    pointer-events: all;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .scroll-arrow-container {
    bottom: 30px;
  }
}
</style> 