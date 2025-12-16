<template>
  <div class="not-found-container">
    <!-- 域名授权验证提示 -->
    <DomainAuthAlert 
      :is-authorized="authStatus.isAuthorized" 
      :api-domain="authStatus.apiDomain" 
    />
    
    <!-- 返回按钮 -->
    <button class="back-button" @click="goBack">
      <IconArrowLeft :size="20" />
      {{ $t('common.back') }}
    </button>

    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">{{ $t('errors.notFound') }}</h2>
      <p class="error-description">{{ $t('errors.notFoundDescription') }}</p>
      <button class="home-button" @click="goHome">
        <IconHome :size="20" />
        {{ $t('errors.backToHome') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { applyDomainAuth } from '@/utils/licenseAuth';
import DomainAuthAlert from '@/components/common/DomainAuthAlert.vue';
import { IconArrowLeft, IconHome } from '@tabler/icons-vue';

export default {
  name: 'NotFound',
  components: {
    IconArrowLeft,
    IconHome,
    DomainAuthAlert
  },
  setup() {
    const router = useRouter();
    const countDown = ref(5);
    
    // 授权状态验证
    const authStatus = ref({
      isAuthorized: true,
      apiDomain: ''
    });
    
    // 返回登录
    const backToHome = () => {
      router.push('/login');
    };
    
    onMounted(() => {
      // 应用授权验证
      authStatus.value = applyDomainAuth();
      
      // 倒计时返回登录
      const timer = setInterval(() => {
        countDown.value--;
        if (countDown.value <= 0) {
          clearInterval(timer);
          backToHome();
        }
      }, 1000);
    });
    
    const goBack = () => {
      router.go(-1);
    };

    const goHome = () => {
      router.push('/');
    };

    return {
      countDown,
      backToHome,
      authStatus,
      goBack,
      goHome
    };
  }
};
</script>

<style lang="scss" scoped>
.not-found-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-color);
  position: relative;
  padding: 20px;
  /* 添加硬件加速 */
  transform: translateZ(0);
}

.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--theme-color);
  font-size: 16px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.1);
  }
}

.not-found-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.error-code {
  font-size: 120px;
  font-weight: 900;
  color: var(--theme-color);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -2px;
  /* 使用渐变效果 */
  background: linear-gradient(45deg, var(--theme-color), rgba(var(--theme-color-rgb), 0.6));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  margin: 10px 0 20px;
}

.error-description {
  font-size: 18px;
  line-height: 1.6;
  color: var(--secondary-text-color);
  margin-bottom: 30px;
}

.home-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: var(--theme-color);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.9);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .error-code {
    font-size: 100px;
  }
  
  .error-title {
    font-size: 24px;
  }
  
  .error-description {
    font-size: 16px;
  }
}
</style> 