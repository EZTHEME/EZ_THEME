<template>
  <div class="dashboard-container">
    <div class="dashboard-inner">
      <div class="dashboard-card welcome-card" :class="{'card-animate': !loading.userInfo}">
        <div class="card-header">
          <h2 class="card-title">{{ $t('dashboard.welcome') }}</h2>
        </div>
        <div class="card-body">
          <p class="">{{ $t('dashboard.welcomeDesc') }}</p>
          <p v-if="userStats.userEmail && DASHBOARD_CONFIG.showUserEmail" class="user-email">
            <IconMail :size="16" />
            <span>{{ userStats.userEmail }}</span>
          </p>
        </div>
      </div>
      
      <!-- 通知区域 -->
      <!-- 待处理事项提示 -->
      <div v-if="hasPendingItems" class="dashboard-card pending-items-card" :class="{'card-animate': !loading.userStats}" style="animation-delay: 0.1s">
        <div class="card-header">
          <h2 class="card-title">{{ $t('dashboard.pendingItems') }}</h2>
        </div>
        <div class="card-body">
          <div class="pending-items-list">
            <div v-if="userStats.pendingOrders > 0" class="pending-item" @click="router.push('/orders')">
              <div class="pending-icon">
                <IconShoppingCart :size="20" />
              </div>
              <div class="pending-info">
                <span class="">{{ $t('dashboard.pendingOrders') }} ({{ userStats.pendingOrders }})</span>
              </div>
              <div class="pending-action">
                <IconChevronRight :size="16" />
              </div>
            </div>
            
            <div v-if="userStats.pendingTickets > 0" class="pending-item" @click="goToSupport">
              <div class="pending-icon">
                <IconMessage :size="20" />
              </div>
              <div class="pending-info">
                <span class="">{{ $t('dashboard.pendingTickets') }} ({{ userStats.pendingTickets }})</span>
              </div>
              <div class="pending-action">
                <IconChevronRight :size="16" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dashboard-card notice-card" :class="{'card-animate': !loading.notices}" v-if="notices && notices.data && notices.data.length > 0" style="animation-delay: 0.2s">
        <div class="card-header">
          <h2 class="card-title">{{ $t('dashboard.siteAnnouncement') }}</h2>
          <div class="notice-counter">
            {{ $t('common.noticeCount', { current: currentNoticeIndex + 1, total: notices.data.length }) }}
          </div>
        </div>
        <div v-if="loading.notices" class="card-body skeleton-loading">
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
          <div class="skeleton-row"></div>
        </div>
        <div v-else class="card-body">
          <transition name="fade-slide" mode="out-in">
            <div class="notice-item" v-if="notices.data[currentNoticeIndex]" :key="currentNoticeIndex">
              <div class="notice-title">{{ notices.data[currentNoticeIndex].title }}</div>
              <div class="notice-footer">
                <div class="notice-date">{{ formatDate(notices.data[currentNoticeIndex].created_at) }}</div>
                <div class="notice-nav">
                  <button 
                    class="btn-notice" 
                    @click="prevNotice" 
                    :disabled="currentNoticeIndex <= 0">
                    <IconChevronLeft :size="16" />
                    {{ $t('common.prevNotice') }}
                  </button>
                  <button 
                    class="btn-notice" 
                    @click="showNoticeModal">
                    <IconEye :size="16" />
                    {{ $t('common.viewDetails') }}
                  </button>
                  <button 
                    class="btn-notice" 
                    @click="nextNotice" 
                    :disabled="currentNoticeIndex >= notices.data.length - 1">
                    {{ $t('common.nextNotice') }}
                    <IconChevronRight :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
      
      <!-- 公告弹窗 -->
      <transition name="fade">
        <div v-if="showNoticeDetails" class="notice-modal-overlay" @click="closeNoticeModal">
          <transition name="popup-slide">
            <div v-if="showNoticeDetails" class="notice-modal" :style="noticeModalStyle" @click.stop>
              <div class="notice-modal-header">
                <h2 class="popup-title">{{ notices.data[currentNoticeIndex].title }}</h2>
                <button class="popup-close-btn" @click="closeNoticeModal">
                  <IconX :size="20" />
                </button>
              </div>
              <div class="notice-modal-content">
                <div v-html="processedNoticeContent" class="notice-content"></div>
              </div>
              <div class="notice-modal-footer">
                <button class="popup-action-btn adaptive-btn" @click="closeNoticeModal">
                  {{ $t('common.close') }}
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
      
      <!-- 套餐信息卡片 -->
      <div v-if="hasPlan" class="dashboard-card subscription-card" :class="{'card-animate': !loading.userInfo}" style="animation-delay: 0.3s">
        <div v-if="loading.userInfo" class="skeleton-card">
          <div class="skeleton-header"></div>
          <div class="skeleton-body">
            <div class="skeleton-row"></div>
            <div class="skeleton-row"></div>
            <div class="skeleton-row"></div>
          </div>
        </div>
        <template v-else>
          <div class="card-header">
            <h2 class="card-title">{{ $t('dashboard.subscriptionInfo') }}</h2>
          </div>
          <div class="card-body">
            <div class="subscription-info">
              <div class="info-item">
                <span class="info-label">{{ $t('dashboard.planName') }}</span>
                <span class="info-value">{{ userPlan.name || $t('dashboard.noSubscription') }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('dashboard.expiryDate') }}</span>
                <span class="info-value">
                  {{ userPlan.isExpireDatePermanent ? $t('dashboard.permanent') : (userPlan.expireDate || $t('dashboard.none')) }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('dashboard.planTraffic') }}</span>
                <span class="info-value">{{ userPlan.totalTraffic || '0 GB' }}</span>
              </div>
              <!-- 添加下次重置时间，只有当resetDay存在时才显示 -->
              <div class="info-item" v-if="userPlan.resetDay">
                <span class="info-label">{{ $t('dashboard.nextResetTime') }}</span>
                <span class="info-value">{{ userPlan.resetDay }} {{ $t('dashboard.days') }}</span>
              </div>
              <!-- 添加在线设备信息，仅当面板类型为 Xiao-board 时显示 -->
              <div class="info-item" v-if="showDeviceLimit">
                <span class="info-label">{{ $t('dashboard.deviceLimit') }}</span>
                <span class="info-value">
                  {{ userPlan.deviceLimit === null ? `${userPlan.aliveIp} / ${$t('dashboard.unlimited')}` : `${userPlan.aliveIp} / ${userPlan.deviceLimit}` }}
                </span>
              </div>
            </div>
            <div class="subscription-actions">
              <button class="btn-outline" :class="{
                'btn-active': showImportCard,
                'btn-highlight-btnbgcolor': DASHBOARD_CONFIG.importButtonHighlightBtnbgcolor
              }" @click="toggleImportCard">
                <IconShare :size="16" class="btn-icon" />
                <span class="">{{ $t('dashboard.importSubscription') }}</span>
              </button>
              <button 
                v-if="showRenewPlanButton"
                class="btn-outline renew-plan-btn" 
                :class="{
                  'renew-warning': isExpiringSoon && !isExpired,
                  'renew-danger': isExpired
                }"
                @click="renewPlan"
              >
                <IconShoppingCart :size="16" class="btn-icon" />
                <span class="">{{ $t('dashboard.renewPlan') }}</span>
              </button>
              <!-- 重置流量按钮 - 根据配置和流量状态显示 -->
              <button 
                v-if="showResetTrafficButton" 
                class="btn-outline reset-traffic-btn" 
                :class="{
                  'reset-warning': isLowTraffic && !isTrafficDepleted,
                  'reset-danger': isTrafficDepleted
                }"
                @click="openResetTrafficModal"
              >
                <IconRefresh :size="16" class="btn-icon" />
                <span class="">{{ $t('dashboard.resetTraffic') }}</span>
              </button>
              <button class="btn-outline" @click="goToSupport">
                <IconMessage :size="16" class="btn-icon" />
                <span class="">{{ $t('dashboard.ticketSupport') }}</span>
              </button>
            </div>
          </div>
        </template>
      </div>
      
      <!-- 订阅导入卡片 -->
      <transition name="slide-fade">
        <div v-if="showImportCard && userPlan.subscribeUrl" class="dashboard-card import-card">
          <div class="card-header">
            <h2 class="card-title">{{ $t('dashboard.importSubscription') }}</h2>
            <button class="close-btn" @click="showImportCard = false">
              <span class="close-icon"></span>
            </button>
          </div>
          <div class="card-body">
            <div class="import-action copy-action" @click="copySubscription">
              <div class="import-icon">
                <IconCopy :size="24" />
              </div>
              <div class="import-content">
                <div class="import-title">{{ $t('dashboard.copySubscription') }}</div>
                <div class="import-desc">{{ $t('dashboard.copySubscriptionDesc') }}</div>
              </div>
            </div>
            
            <div class="import-action qrcode-action" @click="showQrCode = true">
              <div class="import-icon">
                <IconQrcode :size="24" />
              </div>
              <div class="import-content">
                <div class="import-title">{{ $t('dashboard.scanQRCode') }}</div>
                <div class="import-desc">{{ $t('dashboard.scanQRCodeDesc') }}</div>
              </div>
            </div>
            
            <!-- 平台选择器 -->
            <div class="platform-selector">
              <button 
                v-for="platform in platforms" 
                :key="platform.id" 
                class="platform-button" 
                :class="{ 'active': activePlatform === platform.id }"
                @click="activePlatform = platform.id"
              >
                <component :is="platform.icon" :size="16" />
                <span>{{ $t(`platforms.${platform.id}`) }}</span>
              </button>
            </div>
            
            <!-- iOS平台选项 -->
            <div v-if="activePlatform === 'ios'" class="platform-section">
              <div class="platform-title">iOS</div>
              <div v-if="hasIOSClients" class="platform-options">
                <div v-if="clientConfig.showShadowrocket" class="platform-option" @click="importToClient('shadowrocket')">
                  <img :src="shadowrocketIcon" class="client-icon" alt="Shadowrocket" />
                  <span>Shadowrocket</span>
                </div>
                <div v-if="clientConfig.showSurge" class="platform-option" @click="importToClient('surge')">
                  <img :src="surgeIcon" class="client-icon" alt="Surge" />
                  <span>Surge</span>
                </div>
                <div v-if="clientConfig.showStash" class="platform-option" @click="importToClient('stash')">
                  <img :src="stashIcon" class="client-icon" alt="Stash" />
                  <span>Stash</span>
                </div>
                <div v-if="clientConfig.showQuantumultX" class="platform-option" @click="importToClient('quantumultx')">
                  <img :src="quantumultIcon" class="client-icon" alt="Quantumult X" />
                  <span>Quantumult X</span>
                </div>
                <div v-if="clientConfig.showSingboxIOS" class="platform-option" @click="importToClient('singbox-ios')">
                  <img :src="singboxIcon" class="client-icon" alt="Singbox" />
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showLoon" class="platform-option" @click="importToClient('loon')">
                  <img :src="loonIcon" class="client-icon" alt="Loon" />
                  <span>Loon</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>
            
            <!-- Android平台选项 -->
            <div v-if="activePlatform === 'android'" class="platform-section">
              <div class="platform-title">Android</div>
              <div v-if="hasAndroidClients" class="platform-options">
                <div v-if="clientConfig.showV2rayNG" class="platform-option" @click="importToClient('v2rayng')">
                  <img :src="v2rayNGIcon" class="client-icon" alt="V2rayNG" />
                  <span>V2rayNG</span>
                </div>
                <div v-if="clientConfig.showClashAndroid" class="platform-option" @click="importToClient('clash-android')">
                  <img :src="clashAndroidIcon" class="client-icon" alt="Clash" />
                  <span>Clash</span>
                </div>
                <div v-if="clientConfig.showSurfboard" class="platform-option" @click="importToClient('surfboard')">
                  <img :src="surfboardIcon" class="client-icon" alt="Surfboard" />
                  <span>Surfboard</span>
                </div>
                <div v-if="clientConfig.showClashMetaAndroid" class="platform-option" @click="importToClient('clash-meta-android')">
                  <img :src="clashMetaAndroidIcon" class="client-icon" alt="Clash Meta" />
                  <span>Clash Meta</span>
                </div>
                <div v-if="clientConfig.showNekobox" class="platform-option" @click="importToClient('nekobox')">
                  <img :src="nekoboxIcon" class="client-icon" alt="Nekobox" />
                  <span>Nekobox</span>
                </div>
                <div v-if="clientConfig.showSingboxAndroid" class="platform-option" @click="importToClient('singbox-android')">
                  <img :src="singboxAndroidIcon" class="client-icon" alt="Singbox" />
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showHiddifyAndroid" class="platform-option" @click="importToClient('hiddify-android')">
                  <img :src="hiddifyAndroidIcon" class="client-icon" alt="Hiddify" />
                  <span>Hiddify</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>
            
            <!-- Windows平台选项 -->
            <div v-if="activePlatform === 'windows'" class="platform-section">
              <div class="platform-title">Windows</div>
              <div v-if="hasWindowsClients" class="platform-options">
                <div v-if="clientConfig.showClashWindows" class="platform-option" @click="importToClient('clash')">
                  <img :src="clashWindowsIcon" class="client-icon" alt="Clash" />
                  <span>Clash</span>
                </div>
                <div v-if="clientConfig.showNekoray" class="platform-option" @click="importToClient('nekoray')">
                  <img :src="nekorayIcon" class="client-icon" alt="Nekoray" />
                  <span>Nekoray</span>
                </div>
                <div v-if="clientConfig.showSingboxWindows" class="platform-option" @click="importToClient('singbox-windows')">
                  <img :src="singboxWindowsIcon" class="client-icon" alt="Singbox" />
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showHiddifyWindows" class="platform-option" @click="importToClient('hiddify-windows')">
                  <img :src="hiddifyWindowsIcon" class="client-icon" alt="Hiddify" />
                  <span>Hiddify</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>

            <!-- MacOS平台选项 -->
            <div v-if="activePlatform === 'macos'" class="platform-section">
              <div class="platform-title">MacOS</div>
              <div v-if="hasMacOSClients" class="platform-options">
                <div v-if="clientConfig.showClashX" class="platform-option" @click="importToClient('clashx')">
                  <img :src="clashXIcon" class="client-icon" alt="ClashX" />
                  <span>ClashX</span>
                </div>
                <div v-if="clientConfig.showClashMetaX" class="platform-option" @click="importToClient('clashx-meta')">
                  <img :src="clashMetaXIcon" class="client-icon" alt="ClashX Meta" />
                  <span>ClashX Meta</span>
                </div>
                <div v-if="clientConfig.showSurgeMac" class="platform-option" @click="importToClient('surge-mac')">
                  <img :src="surgeMacIcon" class="client-icon" alt="Surge" />
                  <span>Surge</span>
                </div>
                <div v-if="clientConfig.showStashMac" class="platform-option" @click="importToClient('stash-mac')">
                  <img :src="stashMacIcon" class="client-icon" alt="Stash" />
                  <span>Stash</span>
                </div>
                <div v-if="clientConfig.showQuantumultXMac" class="platform-option" @click="importToClient('quantumultx-mac')">
                  <img :src="quantumultXMacIcon" class="client-icon" alt="Quantumult X" />
                  <span>Quantumult X</span>
                </div>
                <div v-if="clientConfig.showSingboxMac" class="platform-option" @click="importToClient('singbox-macos')">
                  <img :src="singboxMacIcon" class="client-icon" alt="Singbox" />
                  <span>Singbox</span>
                </div>
                <div v-if="clientConfig.showHiddifyMac" class="platform-option" @click="importToClient('hiddify-macos')">
                  <img :src="hiddifyMacIcon" class="client-icon" alt="Hiddify" />
                  <span>Hiddify</span>
                </div>
              </div>
              <div v-else class="no-clients-message">
                <p>{{ $t('dashboard.noClientsAvailable') }}</p>
              </div>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- QR码模态窗口 -->
      <transition name="fade">
        <div v-if="showQrCode" class="qrcode-modal-overlay" @click="showQrCode = false">
          <div class="qrcode-modal" @click.stop>
            <div class="qrcode-header">
              <h3>{{ $t('dashboard.scanQRCode') }}</h3>
              <button class="close-btn" @click="showQrCode = false">
                <span class="close-icon"></span>
              </button>
            </div>
            <div class="qrcode-content">
              <div v-if="qrCodeLoading" class="qrcode-loading">
                <div class="loading-spinner"></div>
                <p>{{ $t('common.loadingQRCode') }}</p>
              </div>
              <img v-else :src="qrCodeUrl" alt="QR Code" @load="qrCodeLoaded" />
            </div>
          </div>
        </div>
      </transition>
      
      <div class="stats-grid">
        <template v-if="loading.userStats">
          <div v-for="i in 4" :key="i" class="stats-card skeleton-card">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
              <div class="skeleton-row-sm"></div>
              <div class="skeleton-row-xs"></div>
            </div>
          </div>
        </template>
        
        <template v-else-if="!hasPlan">
          <!-- 没有套餐时显示的提示卡片 -->
          <div class="dashboard-card stats-card no-plan-card" :class="{'card-animate': !loading.userStats}" style="animation-delay: 0.5s; grid-column: span 4; margin: 0 auto; max-width: 1200px; width: 100%;">
            <div class="no-plan-content">
              <div class="no-plan-icon">
                <IconShoppingCart :size="45" class="icon-cart" />
              </div>
              <div class="no-plan-message">
                <div class="no-plan-title">{{ $t('dashboard.noPlanPrompt') }}</div>
                <div class="no-plan-actions">
                  <button class="action-button primary" @click="goToShop">
                    <IconShoppingBag :size="18" class="btn-icon" />
                    <span>{{ $t('dashboard.purchasePlan') }}</span>
                  </button>
                  <button class="action-button secondary" @click="goToSupport">
                    <IconMessage :size="18" class="btn-icon" />
                    <span>{{ $t('dashboard.ticketSupport') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
        
        <template v-else>
        <div class="stats-card" 
            :class="{
              'card-animate': !loading.userStats, 
              'warning-card': isLowTraffic && !isTrafficDepleted,
              'danger-card': isTrafficDepleted
            }" 
            style="animation-delay: 0.5s">
          <div class="stats-icon">
              <IconTransferVertical :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ userStats.remainingTraffic }}</div>
              <div class="stats-label">{{ $t('dashboard.remainingTraffic') }}</div>
          </div>
          
          <!-- 水流进度条效果 -->
          <div class="water-container">
            <div class="water-progress" 
                 :class="{'animate-water': waterAnimationState.canAnimate}" 
                 :style="{ height: waterAnimationState.canAnimate ? `${trafficPercentage}%` : '0%' }">
            </div>
          </div>
        </div>
        
        <div class="stats-card" 
            :class="{
              'card-animate': !loading.userStats,
              'warning-card': isExpiringSoon && !isExpired,
              'danger-card': isExpired
            }" 
            style="animation-delay: 0.6s">
          <div class="stats-icon">
            <IconCalendar :size="32" />
          </div>
          <div class="stats-info">
              <div class="stats-value">
                {{ userStats.isRemainingDaysPermanent ? $t('dashboard.permanent') : userStats.remainingDays + $t('dashboard.days') }}
              </div>
              <div class="stats-label">{{ $t('dashboard.remainingDays') }}</div>
          </div>
        </div>
        
        <div class="stats-card" 
             :class="{'card-animate': !loading.userStats, 'balance-card': true, 'clickable': isXiaoPanel}" 
             style="animation-delay: 0.7s"
             @click="isXiaoPanel ? navigateToDeposit() : null"
             :style="isXiaoPanel ? { cursor: 'pointer' } : {}">
          <div class="stats-icon">
            <IconWallet :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ userStats.accountBalance }}</div>
            <div class="stats-label">{{ $t('dashboard.accountBalance') }}</div>
          </div>
          <div v-if="isXiaoPanel" class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        
        <div class="stats-card doc-card" 
             :class="{'card-animate': !loading.userStats}" 
             @click="openDocumentation" 
             style="animation-delay: 0.8s">
          <div class="stats-icon">
            <IconFileText :size="32" />
          </div>
          <div class="stats-info">
            <div class="stats-value">{{ $t('dashboard.viewHelp') }}</div>
            <div class="stats-label">{{ $t('dashboard.documentation') }}</div>
          </div>
          <div class="chevron-icon">
            <IconChevronRight :size="20" />
          </div>
        </div>
        </template>
      </div>
      
      <!-- 官方客户端下载区域 -->
      <div class="dashboard-card download-card" :class="{'card-animate': !loading.userInfo}" v-if="clientConfig.showDownloadCard" style="animation-delay: 0.9s">
        <div class="card-header">
          <h2 class="card-title">{{ $t('dashboard.officialClients') }}</h2>
        </div>
        <div class="card-body">
          <div class="download-options">
            <div class="download-option" v-if="clientConfig.showIOS" @click="downloadClient('ios')">
              <div class="option-icon ios">
                <IconBrandApple :size="32" />
              </div>
              <div class="option-name">iOS</div>
            </div>
            
            <div class="download-option" v-if="clientConfig.showAndroid" @click="downloadClient('android')">
              <div class="option-icon android">
                <IconBrandAndroid :size="32" />
              </div>
              <div class="option-name">Android</div>
            </div>
            
            <div class="download-option" v-if="clientConfig.showMacOS" @click="downloadClient('macos')">
              <div class="option-icon macos">
                <IconBrandFinder :size="32" />
              </div>
              <div class="option-name">MacOS</div>
            </div>
            
            <div class="download-option" v-if="clientConfig.showWindows" @click="downloadClient('windows')">
              <div class="option-icon windows">
                <IconBrandWindows :size="32" />
              </div>
              <div class="option-name">Windows</div>
            </div>
            
            <div class="download-option" v-if="clientConfig.showLinux" @click="downloadClient('linux')">
              <div class="option-icon linux">
                <IconBrandDebian :size="32" />
              </div>
              <div class="option-name">Linux</div>
            </div>
            
            <div class="download-option" v-if="clientConfig.showOpenWrt" @click="downloadClient('openwrt')">
              <div class="option-icon openwrt">
                <IconRouter :size="32" />
              </div>
              <div class="option-name">OpenWrt</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 重置流量确认弹窗 -->
  <transition name="modal-fade">
    <div class="modal-overlay" v-if="showResetTrafficModal">
      <div class="modal-container">
        <div class="modal-card reset-traffic-modal">
          <div class="modal-header">
            <h3>{{ $t('dashboard.resetTrafficConfirm') }}</h3>
            <button class="close-button" @click="closeResetTrafficModal">×</button>
          </div>
          <div class="modal-body">
            <div class="warning-icon">
              <IconAlertTriangle :size="48" />
            </div>
            <p class="warning-text">{{ $t('dashboard.resetTrafficDesc') }}</p>
            <p class="note-text">{{ $t('dashboard.resetTrafficWarning') }}</p>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeResetTrafficModal">
              {{ $t('common.cancel') }}
            </button>
            <button 
              class="confirm-btn" 
              :disabled="resetConfirmCooldown > 0 || isCreatingResetOrder"
              @click="createResetTrafficOrder"
            >
              <template v-if="isCreatingResetOrder">
                <span class="loading-container">
                  <div class="loader-small"></div>
                  <span>{{ $t('common.loading') }}</span>
                </span>
              </template>
              <template v-else>
                {{ resetConfirmCooldown > 0 ? `${$t('common.confirm')} (${resetConfirmCooldown})` : $t('common.confirm') }}
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed, watch, inject, onBeforeUnmount, nextTick, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { CLIENT_CONFIG, DASHBOARD_CONFIG, SITE_CONFIG, isXiaoV2board } from '@/utils/baseConfig';
import { 
  IconBox, 
  IconSend, 
  IconCalendar, 
  IconUserPlus, 
  IconShoppingCart,
  IconFileText,
  IconWallet,
  IconBrandApple,
  IconBrandAndroid,
  IconBrandWindows,
  IconBrandDebian,
  IconRouter,
  IconBrandFinder,
  IconChevronRight,
  IconTransferVertical,
  IconShare,
  IconMessage,
  IconMail,
  IconChevronLeft,
  IconCopy,
  IconQrcode,
  IconRocket,
  IconWaveSine,
  IconDeviceDesktop,
  IconCrosshair,
  IconPackage,
  IconMoon,
  IconWaveSawTool,
  IconBrandGithub,
  IconCat,
  IconEyeOff,
  IconShoppingBag,
  IconHelpCircle,
  IconCoins,
  IconEye,
  IconRefresh,
  IconAlertTriangle,
  IconX
} from '@tabler/icons-vue';
import { getUserInfo, getSubscribe, getNotices, getUserStats, getUserConfig } from '@/api/dashboard';
import { useToast } from '@/composables/useToast';
import { submitOrder } from '@/api/shop';
import MarkdownIt from 'markdown-it';
// 导入qrcode库
import QRCode from 'qrcode';
// 导入iOS客户端图标
import shadowrocketIconImg from '@/assets/images/client-img-ios/shadowrocket.png';
import surgeIconImg from '@/assets/images/client-img-ios/Surge.png';
import stashIconImg from '@/assets/images/client-img-ios/stash.png';
import quantumultIconImg from '@/assets/images/client-img-ios/quantumultx.png';
import singboxIconImg from '@/assets/images/client-img-ios/singbox.png';
import loonIconImg from '@/assets/images/client-img-ios/loon.png';
// 导入Android客户端图标
import v2rayNGIconImg from '@/assets/images/client-img-android/v2rayng.png';
import clashAndroidIconImg from '@/assets/images/client-img-android/clash.png';
import surfboardIconImg from '@/assets/images/client-img-android/surfboard.png';
import clashMetaAndroidIconImg from '@/assets/images/client-img-android/clashmeta.png';
import nekoboxIconImg from '@/assets/images/client-img-android/nekobox.png';
import singboxAndroidIconImg from '@/assets/images/client-img-android/singbox.png';
import hiddifyAndroidIconImg from '@/assets/images/client-img-android/hiddify.png';
// 导入Windows客户端图标
import clashWindowsIconImg from '@/assets/images/client-img-windows/clash.png';
import nekorayIconImg from '@/assets/images/client-img-windows/nekoray.png';
import singboxWindowsIconImg from '@/assets/images/client-img-windows/singbox.png';
import hiddifyWindowsIconImg from '@/assets/images/client-img-windows/hiddify.png';
// 导入MacOS客户端图标
import clashXIconImg from '@/assets/images/client-img-macos/clashx.png';
import clashMetaXIconImg from '@/assets/images/client-img-macos/clashmetax.png';
import surgeMacIconImg from '@/assets/images/client-img-macos/Surge.png';
import stashMacIconImg from '@/assets/images/client-img-macos/stash.png';
import quantumultXMacIconImg from '@/assets/images/client-img-macos/quantumultx.png';
import singboxMacIconImg from '@/assets/images/client-img-macos/singbox.png';
import hiddifyMacIconImg from '@/assets/images/client-img-macos/hiddify.png';

import { cleanupResources, createTimer } from '@/utils/componentLifecycle';

// 初始化markdown-it
const md = new MarkdownIt({
  html: true,           // 启用HTML标签支持
  breaks: true,         // 启用回车换行
  linkify: true,        // 自动将URL文本转换为链接
  typographer: true,    // 启用智能标点符号替换
});

// 自定义链接渲染，处理eztheme-btn类
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  let href = '';
  
  if (hrefIndex >= 0) {
    href = token.attrs[hrefIndex][1];
  }
  
  // 检查是否包含eztheme-btn标记 - 增强检测方式
  if (href.includes('#eztheme-btn') || href.includes('class=eztheme-btn') || href.includes('?eztheme-btn')) {
    // 移除所有标记
    token.attrs[hrefIndex][1] = href
      .replace('#eztheme-btn', '')
      .replace('class=eztheme-btn', '')
      .replace('?eztheme-btn', '');
    
    // 添加eztheme-btn类
    const classIndex = token.attrIndex('class');
    if (classIndex < 0) {
      token.attrPush(['class', 'eztheme-btn']);
    } else {
      const classes = token.attrs[classIndex][1];
      if (!classes.includes('eztheme-btn')) {
        token.attrs[classIndex][1] = classes + ' eztheme-btn';
      }
    }
  }
  
  // 调用默认的渲染方法
  return self.renderToken(tokens, idx, options);
};

export default {
  name: 'UserDashboard',
  components: {
    IconBox,
    IconSend,
    IconCalendar,
    IconUserPlus,
    IconShoppingCart,
    IconFileText,
    IconWallet,
    IconBrandApple,
    IconBrandAndroid,
    IconBrandWindows,
    IconBrandDebian,
    IconRouter,
    IconBrandFinder,
    IconChevronRight,
    IconTransferVertical,
    IconShare,
    IconMessage,
    IconMail,
    IconChevronLeft,
    IconCopy,
    IconQrcode,
    IconRocket,
    IconWaveSine,
    IconDeviceDesktop,
    IconCrosshair,
    IconPackage,
    IconMoon,
    IconWaveSawTool,
    IconBrandGithub,
    IconCat,
    IconEyeOff,
    IconShoppingBag,
    IconHelpCircle,
    IconCoins,
    IconEye,
    IconRefresh,
    IconAlertTriangle,
    IconX
  },
  setup() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const clientConfig = reactive(CLIENT_CONFIG);
    const notices = ref([]);
    const autoRotateNotices = ref(true);
    const userPlan = ref({
      deviceLimit: null,  // 设备限制，null 表示无限制
      aliveIp: 0,         // 当前在线设备数量
      resetDay: null      // 下次流量重置时间，null 表示不重置
    });
    const qrCodeLoading = ref(true);
    
    // 注入语言变化信号
    const languageChangedSignal = inject('languageChangedSignal', ref(0));
    
    // iOS 客户端图标
    const shadowrocketIcon = shadowrocketIconImg;
    const surgeIcon = surgeIconImg;
    const stashIcon = stashIconImg;
    const quantumultIcon = quantumultIconImg;
    const singboxIcon = singboxIconImg;
    const loonIcon = loonIconImg;
    
    // Android 客户端图标
    const v2rayNGIcon = v2rayNGIconImg;
    const clashAndroidIcon = clashAndroidIconImg;
    const surfboardIcon = surfboardIconImg;
    const clashMetaAndroidIcon = clashMetaAndroidIconImg;
    const nekoboxIcon = nekoboxIconImg;
    const singboxAndroidIcon = singboxAndroidIconImg;
    const hiddifyAndroidIcon = hiddifyAndroidIconImg;
    
    // Windows 客户端图标
    const clashWindowsIcon = clashWindowsIconImg;
    const nekorayIcon = nekorayIconImg;
    const singboxWindowsIcon = singboxWindowsIconImg;
    const hiddifyWindowsIcon = hiddifyWindowsIconImg;
    
    // MacOS 客户端图标
    const clashXIcon = clashXIconImg;
    const clashMetaXIcon = clashMetaXIconImg;
    const surgeMacIcon = surgeMacIconImg;
    const stashMacIcon = stashMacIconImg;
    const quantumultXMacIcon = quantumultXMacIconImg;
    const singboxMacIcon = singboxMacIconImg;
    const hiddifyMacIcon = hiddifyMacIconImg;
    
    const userStats = reactive({
      remainingTraffic: '', // 不默认为0 GB，改为空字符串
      remainingDays: '',
      accountBalance: '0.00',
      pendingOrders: 0,
      pendingTickets: 0,
      userEmail: '',
      isRemainingDaysPermanent: false
    });
    const userBalance = ref('0.00');
    const currencySymbol = ref('$'); // 默认货币符号
    const hasPlan = ref(true); // 默认假设用户有套餐
    const currentNoticeIndex = ref(0);
    const showNoticeDetails = ref(false); // 控制公告详情弹窗
    const showImportCard = ref(false);
    const showQrCode = ref(false);
    const { showToast } = useToast();
    const qrCodeUrl = ref('');
    
    // 平台定义
    const platforms = [
      { id: 'ios', icon: 'IconBrandApple' },
      { id: 'android', icon: 'IconBrandAndroid' },
      { id: 'windows', icon: 'IconBrandWindows' },
      { id: 'macos', icon: 'IconBrandFinder' }
    ];
    
    // 活动平台
    const activePlatform = ref(detectUserPlatform());
    
    // 检测用户平台
    function detectUserPlatform() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // iOS检测
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return 'ios';
      }
      
      // Android检测
      if (/android/i.test(userAgent)) {
        return 'android';
      }
      
      // MacOS检测
      if (/Mac/.test(userAgent)) {
        return 'macos';
      }
      
      // 默认返回Windows平台
      return 'windows';
    }

    // 加载状态
    const loading = reactive({
      userInfo: true,
      userStats: true,
      notices: true,
      userPlan: true,
      subscribe: true
    });
    
    // 跟踪水波动画的状态
    const waterAnimationState = reactive({
      canAnimate: false,
      initialized: false
    });
    
    // 监听加载状态变化，更新水波动画
    watch(() => [loading.userStats, loading.userInfo], ([userStatsLoading, userInfoLoading]) => {
      // 只有当所有必要数据都加载完成时才启用水波动画
      if (!userStatsLoading && !userInfoLoading) {
        // 设置一个短暂的延迟，确保DOM已更新
        setTimeout(() => {
          waterAnimationState.canAnimate = true;
          waterAnimationState.initialized = true;
        }, 500);
      }
    }, { immediate: false, flush: 'post' });
    
    // 监听语言变化，更新显示
    watch(() => locale.value, () => {
      // 如果是永久有效的套餐，更新显示的文本
      if (userPlan.value.isExpireDatePermanent) {
        userPlan.value.expireDate = t('dashboard.permanent');
      }
    });
    
    // 打开使用文档
    const openDocumentation = () => {
      router.push('/docs');
    };
    
    // 下载客户端
    const downloadClient = (platform) => {
      const downloadUrl = clientConfig.clientLinks[platform];
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        // console.log(`下载${platform}客户端: ${downloadUrl}`);
      }
    };
    
    // 跳转到商店页面
    const goToShop = () => {
      router.push('/shop');
    };
    
    // 用户当前套餐ID
    const userPlanId = ref(null);
    
    // 重置流量弹窗相关状态
    const showResetTrafficModal = ref(false);
    const resetConfirmCooldown = ref(0);
    const resetConfirmTimer = ref(null);
    const isCreatingResetOrder = ref(false);
    
    // 打开重置流量确认弹窗
    const openResetTrafficModal = () => {
      showResetTrafficModal.value = true;
      resetConfirmCooldown.value = 3;
      // 开始倒计时
      resetConfirmTimer.value = setInterval(() => {
        if (resetConfirmCooldown.value > 0) {
          resetConfirmCooldown.value--;
        } else {
          clearInterval(resetConfirmTimer.value);
        }
      }, 1000);
    };
    
    // 关闭重置流量确认弹窗
    const closeResetTrafficModal = () => {
      showResetTrafficModal.value = false;
      if (resetConfirmTimer.value) {
        clearInterval(resetConfirmTimer.value);
      }
    };
    
    // 创建重置流量订单
    const createResetTrafficOrder = async () => {
      if (resetConfirmCooldown.value > 0) {
        return; // 冷却时间内不允许确认
      }
      
      // 设置加载状态
      console.log('开始请求：设置 isCreatingResetOrder = true');
      isCreatingResetOrder.value = true;
      
      try {
        // 检查套餐ID是否存在
        if (!userPlanId.value) {
          showToast(t('common.error_occurred'), 'error');
          console.log('无套餐ID：重置 isCreatingResetOrder = false');
          isCreatingResetOrder.value = false;
          return;
        }
        
        // 调用API创建订单
        console.log('正在调用API，当前状态：', isCreatingResetOrder.value);
        const response = await submitOrder({
          plan_id: userPlanId.value,
          period: 'reset_price'
        });
        
        if (response && response.data) {
          // 订单创建成功
          console.log('API请求成功');
          showToast(t('dashboard.resetTrafficSuccess'), 'success');
          
          // 关闭弹窗
          closeResetTrafficModal();
          
          // 跳转到支付页面
          router.push({
            path: '/payment',
            query: {
              trade_no: response.data
            }
          });
        }
      } catch (error) {
        console.error('创建重置流量订单失败:', error);
        showToast(error.message || t('common.error_occurred'), 'error');
      } finally {
        // 无论成功或失败，都重置加载状态
        console.log('请求结束：重置 isCreatingResetOrder = false');
        isCreatingResetOrder.value = false;
      }
    };
    
    // 获取用户信息
    const fetchUserInfo = async () => {
      // 避免重复请求
      if (loading.userInfo === false && Object.keys(userPlan.value).length > 0) return;
      
      loading.userInfo = true;
      try {
        const response = await getUserInfo();
        if (response.data) {
          const info = response.data;
          
          // 保存用户套餐ID
          userPlanId.value = info.plan_id;
          
          // 检查是否有套餐计划
          hasPlan.value = info.plan_id !== null && info.plan_id !== undefined;
          
          if (info.email) {
            userStats.userEmail = info.email;
          }
          if (info.balance !== undefined) {
            userBalance.value = info.balance;
            updateAccountBalanceDisplay(); // 更新余额显示，确保使用正确的货币符号
          }
          if (info.expired_at) {
            userPlan.value.expireDate = formatDate(info.expired_at);
            userPlan.value.isExpireDatePermanent = false;
            
            // 计算剩余天数
            const now = new Date();
            const expiredDate = new Date(info.expired_at * 1000);
            const diffTime = expiredDate - now; // 移除Math.abs，直接计算时间差
            
            // 判断是否已过期
            if (diffTime <= 0) {
              userStats.remainingDays = '0';
              userStats.isRemainingDaysPermanent = false;
            } else {
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              userStats.remainingDays = `${diffDays}`;
              userStats.isRemainingDaysPermanent = false;
            }
          } else {
            // 使用计算属性或直接绑定翻译函数，而不是存储翻译后的值
            userPlan.value.expireDate = null; // 设为null表示永久
            userPlan.value.isExpireDatePermanent = true;
            userStats.remainingDays = null; // 设为null表示永久
            userStats.isRemainingDaysPermanent = true;
          }
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        loading.userInfo = false;
      }
    };

    // 计算属性：剩余天数和流量相关的警告状态
    const isExpiringSoon = computed(() => {
      // 如果是永久套餐则不会过期
      if (userStats.isRemainingDaysPermanent) return false;
      
      // 将剩余天数字符串转换为数字
      const days = parseInt(userStats.remainingDays, 10);
      // 确保是有效数字且在配置的天数阈值范围内
      return !isNaN(days) && days > 0 && days <= DASHBOARD_CONFIG.expiringThreshold;
    });
    
    // 检查iOS平台是否有可用的客户端
    const hasIOSClients = computed(() => {
      return clientConfig.showShadowrocket || 
             clientConfig.showSurge || 
             clientConfig.showStash || 
             clientConfig.showQuantumultX || 
             clientConfig.showSingboxIOS || 
             clientConfig.showLoon;
    });
    
    // 检查Android平台是否有可用的客户端
    const hasAndroidClients = computed(() => {
      return clientConfig.showV2rayNG || 
             clientConfig.showClashAndroid || 
             clientConfig.showSurfboard || 
             clientConfig.showClashMetaAndroid || 
             clientConfig.showNekobox || 
             clientConfig.showSingboxAndroid || 
             clientConfig.showHiddifyAndroid;
    });
    
    // 检查Windows平台是否有可用的客户端
    const hasWindowsClients = computed(() => {
      return clientConfig.showClashWindows || 
             clientConfig.showNekoray || 
             clientConfig.showSingboxWindows || 
             clientConfig.showHiddifyWindows;
    });
    
    // 检查MacOS平台是否有可用的客户端
    const hasMacOSClients = computed(() => {
      return clientConfig.showClashX || 
             clientConfig.showClashMetaX || 
             clientConfig.showSurgeMac || 
             clientConfig.showStashMac || 
             clientConfig.showQuantumultXMac || 
             clientConfig.showSingboxMac || 
             clientConfig.showHiddifyMac;
    });
    
    const isExpired = computed(() => {
      // 如果是永久套餐则不会过期
      if (userStats.isRemainingDaysPermanent) return false;
      
      // 将剩余天数字符串转换为数字
      const days = parseInt(userStats.remainingDays, 10);
      // 确保是有效数字且小于等于0
      return !isNaN(days) && days <= 0; // 已过期
    });
    
    // 是否流量不足
    const isLowTraffic = computed(() => {
      // 获取剩余流量
      const remainingMatch = userStats.remainingTraffic.match(/(\d+(\.\d+)?)\s*([KMGT]?B)/i);
      
      // 如果没有总流量数据或者没有剩余流量数据，则不显示警告
      if (!userPlan.value || !userPlan.value.totalTraffic || !remainingMatch) return false;
      
      const totalMatch = userPlan.value.totalTraffic.match(/(\d+(\.\d+)?)\s*([KMGT]?B)/i);
      if (!totalMatch) return false;
      
      // 转换为相同单位进行比较
      const remainingValue = parseFloat(remainingMatch[1]);
      const remainingUnit = remainingMatch[3].toUpperCase();
      
      const totalValue = parseFloat(totalMatch[1]);
      const totalUnit = totalMatch[3].toUpperCase();
      
      // 单位换算为字节数（近似值）
      const unitToBytes = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
      };
      
      const remainingBytes = remainingValue * unitToBytes[remainingUnit];
      const totalBytes = totalValue * unitToBytes[totalUnit];
      
      // 防止除以0错误
      if (totalBytes === 0) return false;
      
      // 如果已经没有流量了，返回false（由isTrafficDepleted处理）
      if (remainingBytes === 0) return false;
      
      // 计算剩余百分比
      const percentage = (remainingBytes / totalBytes) * 100;
      
      // 使用配置中的阈值
      return percentage > 0 && percentage <= DASHBOARD_CONFIG.lowTrafficThreshold;
    });
    
    // 是否流量耗尽
    const isTrafficDepleted = computed(() => {
      // 获取剩余流量
      const remainingMatch = userStats.remainingTraffic.match(/(\d+(\.\d+)?)\s*([KMGT]?B)/i);
      
      if (!remainingMatch) return false;
      
      const remainingValue = parseFloat(remainingMatch[1]);
      const remainingUnit = remainingMatch[3].toUpperCase();
      
      // 如果单位是B且值接近0，或者值为0，则认为流量已用尽
      if (remainingValue === 0) return true;
      if (remainingUnit === 'B' && remainingValue < 10) return true;
      if (remainingUnit === 'KB' && remainingValue < 0.01) return true;
      
      return false;
    });
    
    // 是否显示重置流量按钮
    const showResetTrafficButton = computed(() => {
      // 如果功能被禁用，不显示按钮
      if (!DASHBOARD_CONFIG.enableResetTraffic) return false;
      
      // 根据显示模式决定是否显示
      switch (DASHBOARD_CONFIG.resetTrafficDisplayMode) {
        case 'always':
          return true;
        case 'low':
          return isLowTraffic.value || isTrafficDepleted.value;
        case 'depleted':
          return isTrafficDepleted.value;
        default:
          return false;
      }
    });
    
    // 是否显示续费套餐按钮
    const showRenewPlanButton = computed(() => {
      // 如果功能被禁用，不显示按钮
      if (!DASHBOARD_CONFIG.enableRenewPlan) return false;
      
      // 永久套餐检查已删除
      
      // 根据显示模式决定是否显示
      switch (DASHBOARD_CONFIG.renewPlanDisplayMode) {
        case 'always':
          return true;
        case 'expiring':
          return isExpiringSoon.value;
        case 'expired':
          return isExpired.value;
        default:
          return false;
      }
    });
    
    // 获取用户订阅信息
    const fetchSubscribe = async () => {
      // 避免重复请求
      if (loading.subscribe === false && userPlan.value.subscribeUrl) return;
      
      loading.subscribe = true;
      try {
        const response = await getSubscribe();
        if (response.data) {
          const subscribe = response.data;
          if (subscribe.plan && subscribe.plan.name) {
            userPlan.value.name = subscribe.plan.name;
          }
          if (subscribe.plan && subscribe.plan.id) {
            userPlanId.value = subscribe.plan.id;
          }
          if (subscribe.expired_at) {
            userPlan.value.expireDate = formatDate(subscribe.expired_at);
            userPlan.value.isExpireDatePermanent = false;
            
            // 计算剩余天数
            const now = new Date();
            const expiredDate = new Date(subscribe.expired_at * 1000);
            const diffTime = expiredDate - now; // 移除Math.abs，直接计算时间差
            
            // 判断是否已过期
            if (diffTime <= 0) {
              userStats.remainingDays = '0';
              userStats.isRemainingDaysPermanent = false;
            } else {
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              userStats.remainingDays = `${diffDays}`;
              userStats.isRemainingDaysPermanent = false;
            }
          } else {
            // 使用计算属性或直接绑定翻译函数，而不是存储翻译后的值
            userPlan.value.expireDate = null; // 设为null表示永久
            userPlan.value.isExpireDatePermanent = true;
            userStats.remainingDays = null; // 设为null表示永久
            userStats.isRemainingDaysPermanent = true;
          }
          if (subscribe.transfer_enable) {
            userPlan.value.totalTraffic = formatTraffic(subscribe.transfer_enable);
          }
          if (subscribe.transfer_enable && subscribe.u !== undefined && subscribe.d !== undefined) {
            // 计算剩余流量，确保不会出现负数
            const usedTraffic = subscribe.u + subscribe.d;
            const remainingTraffic = Math.max(0, subscribe.transfer_enable - usedTraffic);
            userStats.remainingTraffic = formatTraffic(remainingTraffic);
          }
          if (subscribe.reset_day) {
            userPlan.value.resetDay = subscribe.reset_day;
          }
          if (subscribe.subscribe_url) {
            userPlan.value.subscribeUrl = subscribe.subscribe_url;
          }
          
          // 处理设备限制和在线设备信息 - 适配 Xiao-board 面板
          if (subscribe.device_limit !== undefined) {
            userPlan.value.deviceLimit = subscribe.device_limit;
          }
          if (subscribe.alive_ip !== undefined) {
            userPlan.value.aliveIp = subscribe.alive_ip;
          }
          
          // 计算剩余天数
          if (subscribe.expired_at) {
            const now = new Date();
            const expiredDate = new Date(subscribe.expired_at * 1000);
            const diffTime = expiredDate - now; // 移除Math.abs，直接计算时间差
            
            // 判断是否已过期
            if (diffTime <= 0) {
              userStats.remainingDays = '0';
              userStats.isRemainingDaysPermanent = false;
            } else {
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              userStats.remainingDays = `${diffDays}`;
              userStats.isRemainingDaysPermanent = false;
            }
          } else {
            userStats.remainingDays = null; // 设为null表示永久
            userStats.isRemainingDaysPermanent = true;
          }
        }
      } catch (error) {
        console.error('获取订阅信息失败:', error);
      } finally {
        loading.subscribe = false;
      }
    };

    // 获取用户通知
    const fetchNotices = async () => {
      // 避免重复请求
      if (loading.notices === false && notices.value.data && notices.value.data.length > 0) return;
      
      loading.notices = true;
      try {
        const response = await getNotices();
        if (response && response.data) {
          // 直接赋值API返回的对象，不需要再取response.data.data
          notices.value = response;
          // console.log('获取到的通知数据:', notices.value);
          
          // 检查是否有需要弹窗的公告
          checkForPopupNotices();
        }
      } catch (error) {
        // console.error('获取通知失败:', error);
      } finally {
        loading.notices = false;
      }
    };
    
    // 检查是否有需要弹窗的公告
    const checkForPopupNotices = () => {
      if (!notices.value || !notices.value.data || notices.value.data.length === 0) return;
      
      // 查找第一个包含"弹窗"标记的公告 (在tags数组中)
      const popupNoticeIndex = notices.value.data.findIndex(notice => 
        notice.tags && Array.isArray(notice.tags) && notice.tags.includes('\u5f39\u7a97')
      );
      
      // 如果找到了需要弹窗的公告
      if (popupNoticeIndex !== -1) {
        const noticeId = notices.value.data[popupNoticeIndex].id;
        const popupShownKey = `popup_notice_shown_${noticeId}`;
        
        // 检查是否已经显示过该弹窗
        if (!sessionStorage.getItem(popupShownKey)) {
          // 设置当前索引为该公告
          currentNoticeIndex.value = popupNoticeIndex;
          // 打开弹窗
          showNoticeDetails.value = true;
          // 记录已显示过的弹窗，避免同一会话中重复显示
          sessionStorage.setItem(popupShownKey, 'true');
        }
      }
    };

    // 获取用户统计数据
    const fetchUserStats = async () => {
      // 避免重复请求
      if (loading.userStats === false && userStats.remainingTraffic !== '0 GB') return;
      
      loading.userStats = true;
      try {
        const response = await getUserStats();
        if (response.data && Array.isArray(response.data) && response.data.length >= 2) {
          // 处理统计数据 [待付订单数, 待办工单数]
          const stats = response.data;
          userStats.pendingOrders = stats[0];
          userStats.pendingTickets = stats[1];
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        loading.userStats = false;
      }
    };

    // 格式化流量数据
    const formatTraffic = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // 计算是否有待处理事项
    const hasPendingItems = computed(() => {
      return userStats.pendingOrders > 0 || userStats.pendingTickets > 0;
    });
    
    const prevNotice = () => {
      if (currentNoticeIndex.value > 0) {
        currentNoticeIndex.value--;
      }
    };

    const nextNotice = () => {
      if (currentNoticeIndex.value < notices.value.data.length - 1) {
        currentNoticeIndex.value++;
      }
    };

    // 显示公告弹窗
    const showNoticeModal = () => {
      showNoticeDetails.value = true;
      nextTick(() => {
        updateModalHeight();
      });
    };

    // 关闭公告弹窗
    const closeNoticeModal = () => {
      showNoticeDetails.value = false;
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString * 1000); // 转换时间戳为日期
      return date.toLocaleDateString();
    };

    // 更新二维码URL
    const updateQRCodeUrl = () => {
      if (userPlan.value.subscribeUrl) {
        qrCodeLoading.value = true;
        try {
          // 使用qrcode库在本地生成二维码
          QRCode.toDataURL(userPlan.value.subscribeUrl, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
          .then(url => {
            qrCodeUrl.value = url;
            qrCodeLoading.value = false;
          })
          .catch(err => {
            console.error('二维码生成失败:', err);
            qrCodeLoading.value = false;
            showToast(t('dashboard.qrCodeGenerationFailed'), 'error', 3000);
          });
        } catch (error) {
          console.error('生成二维码失败:', error);
          qrCodeLoading.value = false;
          showToast(t('dashboard.qrCodeGenerationFailed'), 'error', 3000);
        }
      }
    };
    
    // 二维码加载完成
    const qrCodeLoaded = () => {
      qrCodeLoading.value = false;
    };
    
    // 复制订阅链接
    const copySubscription = () => {
      if (userPlan.value.subscribeUrl) {
        // 尝试使用现代Clipboard API
        const copyWithAPI = () => {
          navigator.clipboard.writeText(userPlan.value.subscribeUrl)
            .then(() => {
              showToast(t('dashboard.subscriptionCopied'), 'success', 3000);
            })
            .catch(() => { 
              showToast(t('dashboard.copyFailed'), 'error', 3000);
            });
        };
        
        // 后备复制方法
        const copyWithFallback = () => {
          try {
            // 创建临时文本区域
            const textarea = document.createElement('textarea');
            textarea.value = userPlan.value.subscribeUrl;
            // 确保不在视窗外
            textarea.style.position = 'fixed';
            textarea.style.left = '0';
            textarea.style.top = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            // 执行复制命令
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (successful) {
              showToast(t('dashboard.subscriptionCopied'), 'success', 3000);
            } else {
              showToast(t('dashboard.copyFailed'), 'error', 3000);
            }
          } catch (err) {
            console.error('使用后备方法复制失败:', err);
            showToast(t('dashboard.copyFailed'), 'error', 3000);
          }
        };
        
        // 首先尝试使用现代API
        if (navigator.clipboard) {
          copyWithAPI();
        } else {
          copyWithFallback();
        }
      }
    };

    // 导入到指定客户端
    const importToClient = (clientType) => {
      if (!userPlan.value.subscribeUrl) {
        showToast(t('dashboard.noSubscription'), 'error', 3000);
        return;
      }
      
      const subscribeUrl = userPlan.value.subscribeUrl;
      const siteName = SITE_CONFIG.siteName || '订阅';
      
      let url = '';
      let shouldUseCurrentWindow = true; // 默认在当前窗口打开
      
      try {
        switch (clientType) {
          case 'shadowrocket':
            url = `shadowrocket://add/sub://${btoa(subscribeUrl)}?remarks=${encodeURIComponent(siteName)}`;
            break;
          case 'surge':
            url = `surge:///install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'surge-mac':
            url = `surge:///install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'stash':
            url = `stash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'stash-mac':
            url = `stash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'quantumultx':
            url = `quantumult-x:///update-configuration?remote-resource=${encodeURI(JSON.stringify({
              server_remote: [`${subscribeUrl}, tag=${siteName}`]
            }))}`;
            break;
          case 'quantumultx-mac':
            url = `quantumult-x:///update-configuration?remote-resource=${encodeURI(JSON.stringify({
              server_remote: [`${subscribeUrl}, tag=${siteName}`]
            }))}`;
            break;
          case 'loon':
            url = `loon://import?url=${encodeURIComponent(subscribeUrl)}`;
            break;
          case 'v2rayng':
            url = `v2rayng://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'clash':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'clash-android':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'clash-meta-android':
            url = `clashmeta://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'surfboard':
            // Surfboard可以使用Surge的URL Scheme或自己的
            url = `surfboard:///install-config?url=${encodeURIComponent(subscribeUrl)}`;
            break;
          case 'nekobox':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'nekoray':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'clashx':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'clashx-meta':
            url = `clash://install-config?url=${encodeURIComponent(subscribeUrl)}&name=${encodeURIComponent(siteName)}`;
            break;
          case 'singbox-ios':
            url = `sing-box://import-remote-profile?url=${encodeURIComponent(subscribeUrl)}#${encodeURIComponent(siteName)}`;
            break;
          case 'singbox-android':
            url = `sing-box://import-remote-profile?url=${encodeURIComponent(subscribeUrl)}#${encodeURIComponent(siteName)}`;
            break;
          case 'singbox-windows':
            url = `sing-box://import-remote-profile?url=${encodeURIComponent(subscribeUrl)}#${encodeURIComponent(siteName)}`;
            break;
          case 'singbox-macos':
            url = `sing-box://import-remote-profile?url=${encodeURIComponent(subscribeUrl)}#${encodeURIComponent(siteName)}`;
            break;
          case 'hiddify-android':
            url = `hiddify://install-sub?url=${encodeURIComponent(subscribeUrl + "&flag=hiddify")}`;
            break;
          case 'hiddify-windows':
            url = `hiddify://install-sub?url=${encodeURIComponent(subscribeUrl + "&flag=hiddify")}`;
            break;
          case 'hiddify-macos':
            url = `hiddify://install-sub?url=${encodeURIComponent(subscribeUrl + "&flag=hiddify")}`;
            break;
          default:
            // 对于其他客户端，复制到剪贴板
            navigator.clipboard.writeText(subscribeUrl)
              .then(() => {
                showToast(t('dashboard.subscriptionCopied'), 'success', 3000);
              })
              .catch(() => { 
                showToast(t('dashboard.copyFailed'), 'error', 3000);
              });
            return;
        }
        
        // 尝试打开URL
        if (url) {
          if (shouldUseCurrentWindow) {
            // 直接使用location.href打开URL，不进行错误检测
            // 这样可以避免在用户长时间未响应打开许可时误判为客户端未安装
            window.location.href = url;
          } else {
            window.open(url, '_blank');
          }
        }
      } catch (error) {
        console.error('导入客户端失败:', error);
      }
    };

    // 前往工单支持页面
    const goToSupport = () => {
      // 根据屏幕尺寸跳转到对应的工单页面
      if (window.innerWidth < 905) {
        router.push('/mobile/tickets');
      } else {
        router.push('/tickets');
      }
    };

    // 切换导入卡片显示状态
    const toggleImportCard = () => {
      showImportCard.value = !showImportCard.value;
      if (showImportCard.value) {
        // 使用nextTick确保DOM更新完成后再滚动
        nextTick(() => {
          setTimeout(() => {
            const importCard = document.querySelector('.import-card');
            if (importCard) {
              importCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
            }
          }, 100); // 添加短暂延迟确保过渡动画开始后再滚动
        });
      }
    };

    // 获取用户通用配置（货币符号等）
    const fetchUserConfig = async () => {
      try {
        const response = await getUserConfig();
        if (response.data) {
          // 获取货币符号
          if (response.data.currency_symbol) {
            currencySymbol.value = response.data.currency_symbol;
            // 更新已经加载的余额显示
            if (userStats.accountBalance) {
              updateAccountBalanceDisplay();
            }
          }
        }
      } catch (error) {
        console.error('获取用户配置失败:', error);
      }
    };

    // 更新账户余额显示
    const updateAccountBalanceDisplay = () => {
      if (userBalance.value) {
        userStats.accountBalance = `${currencySymbol.value}${(parseFloat(userBalance.value) / 100).toFixed(2)}`;
      }
    };

    onMounted(async () => {
      // 获取货币符号配置
      await fetchUserConfig();
      
      // 获取用户基本信息
      fetchUserInfo();
      
      // 获取订阅信息
      fetchSubscribe();
      
      // 获取通知
      fetchNotices();
      
      // 获取统计数据
      fetchUserStats();
      
      // 预加载二维码
      updateQRCodeUrl();
    });
    
    // 监听订阅URL变化，更新二维码
    watch(() => userPlan.value.subscribeUrl, () => {
      updateQRCodeUrl();
    });
    
    // 添加一个计算属性来处理公告内容
    const processedNoticeContent = computed(() => {
      if (!notices.value?.data?.[currentNoticeIndex.value]?.content) {
        return '';
      }
      
      const content = notices.value.data[currentNoticeIndex.value].content;
      
      // 检查内容是否包含HTML标签
      const hasHtml = /<[a-z][\s\S]*>/i.test(content);
      
      if (hasHtml) {
        // 如果包含HTML标签，处理HTML内容
        let processedContent = content.replace(/\n/g, '<br>');
        
        // 处理按钮样式，为所有包含eztheme-btn的按钮和链接添加样式
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedContent;
        
        // 查找所有的按钮和链接元素
        const buttons = tempDiv.querySelectorAll('button, a');
        buttons.forEach(button => {
          if (button.className && button.className.includes('eztheme-btn')) {
            // 移除所有可能冲突的默认样式类和属性
            button.classList.remove('markdown-link');
            button.style.textDecoration = 'none';
            button.style.borderBottom = 'none';
            button.setAttribute('data-no-markdown-style', 'true');
          }
          
          // 检查链接中是否包含eztheme-btn标记，如果有则添加类
          if (button.tagName.toLowerCase() === 'a') {
            const href = button.getAttribute('href');
            if (href && (href.includes('#eztheme-btn') || href.includes('?eztheme-btn') || href.includes('class=eztheme-btn'))) {
              button.href = href
                .replace('#eztheme-btn', '')
                .replace('?eztheme-btn', '')
                .replace('class=eztheme-btn', '');
              button.classList.add('eztheme-btn');
              button.style.textDecoration = 'none';
              button.style.borderBottom = 'none';
              button.setAttribute('data-no-markdown-style', 'true');
            }
          }
        });
        
        return tempDiv.innerHTML;
      } else {
        // 如果不包含HTML标签，使用markdown-it渲染
        return md.render(content);
      }
    });
    
    // 窗口大小变化时调整弹窗高度
    const windowWidth = ref(window.innerWidth);
    const windowHeight = ref(window.innerHeight);
    const noticeModalStyle = ref({});

    const updateModalHeight = () => {
      const isMobile = windowWidth.value <= 768;
      const availableHeight = windowHeight.value * (isMobile ? 0.75 : 0.8); // 根据屏幕大小使用总高度的75%或80%
      
      noticeModalStyle.value = {
        maxHeight: `${availableHeight}px`
      };
    };

    const handleResize = () => {
      windowWidth.value = window.innerWidth;
      windowHeight.value = window.innerHeight;
      if (showNoticeDetails.value) {
        updateModalHeight();
      }
    };

    onMounted(() => {
      window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
    });
    
    // 续费当前套餐
    const renewPlan = () => {
      // 检查当前套餐ID
      if (!userPlanId.value) {
        showToast(t('dashboard.noPlanToRenew'), 'error', 3000);
        return;
      }
      
      // 跳转到订单确认页面，并传递当前套餐ID
      router.push(`/order-confirm?id=${userPlanId.value}`);
    };
    
    // 是否为Xiao-V2board面板
    const isXiaoPanel = isXiaoV2board();
    
    // 跳转到充值页面
    const navigateToDeposit = () => {
      router.push('/wallet/deposit');
    };
    
    const showDeviceLimit = computed(() => {
      // 仅当面板类型为Xiao-V2board且配置开启时显示设备限制
      return isXiaoV2board() && DASHBOARD_CONFIG.showOnlineDevicesLimit;
    });
    
    // 保存所有定时器引用
    const timers = {};
    // 保存所有事件监听器引用
    const listeners = {};
    
    // 在相关函数中使用createTimer替代setTimeout或setInterval
    const startAutoRotateNotices = () => {
      if (!autoRotateNotices.value) return;
      
      // 使用createTimer替代setInterval
      createTimer(timers, 'noticeRotation', () => {
        if (notices.value && notices.value.data && notices.value.data.length > 1) {
          nextNotice();
        }
      }, 8000, true);
    };
    
    // 在activated生命周期钩子中添加资源初始化
    onActivated(() => {
      console.log('Dashboard组件被激活');
      // 组件被激活时需要执行的操作，例如刷新数据
      if (needRefreshData.value) {
        fetchUserInfo();
        fetchUserStats();
        fetchNotices();
        needRefreshData.value = false;
      }
      
      // 重新启动自动轮播
      startAutoRotateNotices();
    });

    // 在deactivated生命周期钩子中添加资源清理
    onDeactivated(() => {
      console.log('Dashboard组件被停用');
      // 组件被缓存时标记需要刷新数据
      needRefreshData.value = true;
      
      // 清理所有定时器和事件监听器
      cleanupResources(timers, listeners);
    });

    // 组件卸载时清理资源
    onUnmounted(() => {
      cleanupResources(timers, listeners);
    });

    // 添加一个变量来标记是否需要刷新数据
    const needRefreshData = ref(false);
    
    // 计算流量剩余百分比
    const trafficPercentage = computed(() => {
      // 获取剩余流量
      const remainingMatch = userStats.remainingTraffic.match(/(\d+(\.\d+)?)\s*([KMGT]?B)/i);
      
      // 如果没有总流量数据或者没有剩余流量数据，则返回0
      if (!userPlan.value || !userPlan.value.totalTraffic || !remainingMatch) return 0;
      
      const totalMatch = userPlan.value.totalTraffic.match(/(\d+(\.\d+)?)\s*([KMGT]?B)/i);
      if (!totalMatch) return 0;
      
      // 转换为相同单位进行比较
      const remainingValue = parseFloat(remainingMatch[1]);
      const remainingUnit = remainingMatch[3].toUpperCase();
      
      const totalValue = parseFloat(totalMatch[1]);
      const totalUnit = totalMatch[3].toUpperCase();
      
      // 单位换算为字节数（近似值）
      const unitToBytes = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
      };
      
      const remainingBytes = remainingValue * unitToBytes[remainingUnit];
      const totalBytes = totalValue * unitToBytes[totalUnit];
      
      // 防止除以0错误
      if (totalBytes === 0) return 0;
      
      // 计算剩余百分比
      return Math.min(Math.max(Math.round((remainingBytes / totalBytes) * 100), 0), 100);
    });
    
    return {
      userStats,
      userBalance,
      currencySymbol,
      userPlan,
      clientConfig,
      notices,
      loading,
      languageChangedSignal,
      goToShop,
      openDocumentation,
      downloadClient,
      hasPendingItems,
      router,
      currentNoticeIndex,
      prevNotice,
      nextNotice,
      showImportCard,
      showQrCode,
      importToClient,
      goToSupport,
      formatDate,
      formatTraffic,
      toggleImportCard,
      copySubscription,
      platforms,
      activePlatform,
      qrCodeUrl,
      qrCodeLoading,
      qrCodeLoaded,
      showNoticeModal,
      closeNoticeModal,
      showNoticeDetails,
      checkForPopupNotices,
      noticeModalStyle,
      // 重置流量功能
      openResetTrafficModal,
      closeResetTrafficModal,
      createResetTrafficOrder,
      showResetTrafficModal,
      resetConfirmCooldown,
      showResetTrafficButton,
      isCreatingResetOrder,
      // 客户端可用性检查
      hasIOSClients,
      hasAndroidClients,
      hasWindowsClients,
      hasMacOSClients,
      // iOS 客户端图标
      shadowrocketIcon,
      surgeIcon,
      stashIcon,
      quantumultIcon,
      singboxIcon,
      loonIcon,
      // Android 客户端图标
      v2rayNGIcon,
      clashAndroidIcon,
      surfboardIcon,
      clashMetaAndroidIcon,
      nekoboxIcon,
      singboxAndroidIcon,
      hiddifyAndroidIcon,
      // Windows 客户端图标
      clashWindowsIcon,
      nekorayIcon,
      singboxWindowsIcon,
      hiddifyWindowsIcon,
      // MacOS 客户端图标
      clashXIcon,
      clashMetaXIcon,
      surgeMacIcon,
      stashMacIcon,
      quantumultXMacIcon,
      singboxMacIcon,
      hiddifyMacIcon,
      isExpiringSoon,
      isExpired,
      isLowTraffic,
      isTrafficDepleted,
      hasPlan,
      processedNoticeContent,
      showRenewPlanButton,
      renewPlan,
      isXiaoPanel,
      navigateToDeposit,
      showDeviceLimit,
      needRefreshData,
      trafficPercentage,
      waterAnimationState,
      DASHBOARD_CONFIG,
    };
  }
};
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  
  .dashboard-inner {
    width: 100%;
    max-width: 1200px;
  }
  
  .welcome-card {
    margin-bottom: 24px;
    
    .user-email {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(var(--theme-color-rgb), 0.1);
      color: var(--secondary-text-color);
      font-size: 14px;
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
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
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
      
      .card-actions {
        display: flex;
        gap: 10px;
      }
    }
  }
  
  .subscription-card {
    margin-bottom: 24px;
    
    .subscription-info {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 15px;
      
      .info-item {
        display: flex;
        flex-direction: column;
        
        .info-label {
          font-size: 13px;
          color: var(--secondary-text-color);
          margin-bottom: 5px;
        }
        
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color);
        }
      }
    }
    
    .subscription-actions {
      display: flex;
      gap: 12px;
      margin-top: 15px;
      
      @media (min-width: 769px) {
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: flex-start;
        
        button {
          flex: 0 0 auto;
          min-width: 120px;
        }
      }
      
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 10px;
        
        button {
          width: 100%;
        }
      }
      
      // 重置流量按钮样式
      .reset-traffic-btn {
        position: relative;
        overflow: hidden;
        
        &.reset-warning {
          color: #ff9800;
          border-color: #ff9800;
          background-color: rgba(255, 152, 0, 0.1);
        }
        
        &.reset-danger {
          color: #f44336;
          border-color: #f44336;
          background-color: rgba(244, 67, 54, 0.1);
        }
      }
      
      // 续费套餐按钮样式
      .renew-plan-btn {
        position: relative;
        overflow: hidden;
        
        &.renew-warning {
          color: #ff9800;
          border-color: #ff9800;
          background-color: rgba(255, 152, 0, 0.1);
        }
        
        &.renew-danger {
          color: #f44336;
          border-color: #f44336;
          background-color: rgba(244, 67, 54, 0.1);
        }
      }
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr));
    }
    
    @media (min-width: 1200px) {
      grid-template-columns: repeat(4, 1fr);
    }
    
    .stats-card {
      position: relative;
      background-color: var(--card-bg-color);
      border-radius: 16px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px;
      transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
      overflow: hidden;
      border: 1px solid var(--border-color);
      
      // 水流进度条容器
      .water-container {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
      }
      
      // 水流进度条
      .water-progress {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        background-color: rgba(var(--theme-color-rgb), 0.12);
        transition: none; /* 初始无过渡效果 */
        border-radius: 0 0 16px 16px;
        height: 0; /* 初始高度为0 */
        
        &.animate-water {
          transition: height 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        &:after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
        }
      }
      
      // 确保内容在水波效果上面显示
      .stats-icon, .stats-info {
        position: relative;
        z-index: 1;
      }
      
      &.warning-card .water-progress {
        background-color: rgba(255, 152, 0, 0.15);
      }
      
      &.danger-card .water-progress {
        background-color: rgba(244, 67, 54, 0.15);
      }
      
      @keyframes wave {
        0% {
          transform: translateX(0) translateZ(0);
        }
        100% {
          transform: translateX(-50%) translateZ(0);
        }
      }
      
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
      
      .chevron-icon {
        color: var(--theme-color);
        opacity: 0.5;
        transition: all 0.3s ease;
      }
      
      &:hover {
        .chevron-icon {
          transform: translateX(3px);
          opacity: 1;
        }
      }
    }
  }
  
  /* 官方客户端下载样式 */
  .download-card {
    .download-options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 20px;
      
      @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
      }
      
      @media (min-width: 992px) {
        grid-template-columns: repeat(6, 1fr);
      }
      
      .download-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        padding: 15px;
        border-radius: 10px;
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);
        
        &:hover {
          background-color: rgba(var(--theme-color-rgb), 0.05);
          transform: translateY(-2px);
        }
        
        .option-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin-bottom: 12px;
          
          &.ios {
            background-color: rgba(0, 122, 255, 0.1);
            color: #007aff;
          }
          
          &.android {
            background-color: rgba(61, 178, 74, 0.1);
            color: #3db24a;
          }
          
          &.macos {
            background-color: rgba(90, 90, 90, 0.1);
            color: #5a5a5a;
          }
          
          &.windows {
            background-color: rgba(0, 120, 215, 0.1);
            color: #0078d7;
          }
          
          &.linux {
            background-color: rgba(243, 123, 29, 0.1);
            color: #f37b1d;
          }
          
          &.openwrt {
            background-color: rgba(0, 136, 204, 0.1);
            color: #0088cc;
          }
        }
        
        .option-name {
          font-size: 14px;
          font-weight: 500;
        }
      }
    }
  }

  /* 通知区域样式 */
  .notice-card {
    margin-bottom: 24px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .notice-counter {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
    }
    
    .notice-item {
      position: relative;
      padding: 16px;
      border-radius: 8px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      
      .notice-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-color);
      }
      
      .notice-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        
        .notice-date {
          font-size: 12px;
          color: var(--secondary-text-color);
          opacity: 0.7;
        }
        
        .notice-nav {
          display: flex;
          gap: 8px;
          
          .btn-notice {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 13px;
            background-color: rgba(var(--theme-color-rgb), 0.1);
            color: var(--theme-color);
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            
            &:hover:not(:disabled) {
              background-color: rgba(var(--theme-color-rgb), 0.2);
              transform: translateY(-1px);
            }
            
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
        
        @media (max-width: 576px) {
          flex-direction: column;
          align-items: flex-start;
          
          .notice-nav {
            width: 100%;
            
            .btn-notice {
              flex: 1;
              justify-content: center;
              padding: 8px;
            }
          }
        }
        
        @media (max-width: 470px) {
          .notice-nav {
            display: grid;
            grid-template-rows: auto auto;
            gap: 8px;
            width: 100%;
            
            .btn-notice:nth-child(2) {
              grid-row: 1;
              grid-column: 1 / span 2;
            }
            
            .btn-notice:nth-child(1),
            .btn-notice:nth-child(3) {
              grid-row: 2;
            }
            
            .btn-notice:nth-child(1) {
              grid-column: 1;
            }
            
            .btn-notice:nth-child(3) {
              grid-column: 2;
            }
            
            .btn-notice {
              margin: 0;
              width: 100%;
            }
          }
        }
      }
    }
  }

  /* 待处理事项卡片样式 */
  .pending-items-card {
    margin-bottom: 24px;
    
    .pending-items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .pending-item {
      display: flex;
      align-items: center;
      padding: 15px;
      border-radius: 10px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.1);
        transform: translateY(-2px);
      }
      
      .pending-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background-color: rgba(var(--theme-color-rgb), 0.15);
        color: var(--theme-color);
        margin-right: 15px;
      }
      
      .pending-info {
        flex: 1;
        font-weight: 500;
      }
      
      .pending-action {
        color: var(--secondary-text-color);
        transition: transform 0.3s ease;
      }
      
      &:hover .pending-action {
        transform: translateX(3px);
        color: var(--theme-color);
      }
    }
  }
}

/* 骨架屏样式 */
.skeleton-loading {
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 2s infinite;
    z-index: 1;
  }
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* 按钮样式 */
.btn-primary, .btn-outline, .btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  .btn-icon {
    margin-right: 4px;
  }
}

.btn-primary {
  background-color: var(--theme-color);
  color: white;
  border: none;
  
  &:hover {
    background-color: var(--primary-color-hover);
    transform: translateY(-1px);
  }
}

.btn-outline {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  
  &:hover {
    border-color: var(--theme-color);
    color: var(--theme-color);
    background-color: rgba(var(--theme-color-rgb), 0.05);
    transform: translateY(-1px);
  }
  
  /* 高光效果和底色填充效果 */
  &.btn-highlight-btnbgcolor {
    position: relative;
    overflow: hidden;
    background-color: var(--theme-color);
    color: white;
    border-color: var(--theme-color);
    
    &:hover {
      background-color: var(--primary-color-hover, var(--theme-color));
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(var(--theme-color-rgb), 0.25);
    }
    
    &::before {
      content: '';
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
      animation: card-shimmer 3s infinite;
      transform: skewX(-25deg);
    }
  }
}

@keyframes card-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

.btn-action {
  background-color: transparent;
  color: var(--secondary-text-color);
  border: none;
  padding: 5px 10px;
  font-size: 13px;
  
  &:hover {
    color: var(--theme-color);
    background-color: rgba(var(--theme-color-rgb), 0.05);
  }
  
  .action-icon {
    width: 16px;
    height: 16px;
  }
}

/* 公告过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 15px;
    padding-bottom: 80px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .subscription-card .subscription-info {
    flex-direction: column;
    gap: 15px;
  }
  
  .subscription-card .info-item {
    width: 100%;
    padding: 0;
    border-right: none;
    border-bottom: 1px solid var(--border-light-color);
    padding-bottom: 15px;
  }
  
  .subscription-card .info-item:last-child {
    border-bottom: none;
  }
  
  .subscription-actions {
    flex-direction: column;
    margin-top: 15px;
  }
  
  .platform-selector {
    flex-wrap: wrap;
  }
  
  .no-plan-content {
    flex-direction: column;
    text-align: center;
    align-items: center;
    gap: 16px;
    width: 100%;
  }
  
  .no-plan-icon {
    width: 65px;
    height: 65px;
    margin: 0 auto;
    transform: rotate(0deg);
  }
  
  .no-plan-icon .icon-cart {
    width: 36px;
    height: 36px;
  }
  
  .no-plan-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    text-align: center;
  }
  
  .no-plan-title {
    font-size: 1.1rem;
    margin-bottom: 12px;
    text-align: center;
  }
  
  .no-plan-actions {
    justify-content: center;
    width: 100%;
    gap: 10px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .no-plan-actions .action-button {
    padding: 8px 15px;
    min-width: 120px;
    justify-content: center;
  }
  
  .no-plan-actions .action-button span {
    font-size: 14px;
  }
  
  .no-plan-actions .action-button .btn-icon {
    width: 16px;
    height: 16px;
  }
  
  .stats-card.no-plan-card {
    padding: 15px 12px;
  }
}

@media (min-width: 769px) {
  .subscription-actions {
    display: flex;
    flex-direction: row;
    gap: 12px;
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

/* 文档卡片特殊样式 */
.stats-card.doc-card {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stats-card.doc-card:hover {
  background-color: rgba(var(--theme-color-rgb), 0.08);
  transform: translateY(-3px);
}

.stats-card.doc-card .stats-icon {
  background-color: rgba(92, 124, 250, 0.15);
  color: #5c7cfa;
}

.stats-card.doc-card .stats-value {
  color: var(--theme-color);
}

.stats-card.doc-card::after {
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
  animation: card-shimmer 3s infinite;
  transform: skewX(-25deg);
}

@keyframes card-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

/* 导入按钮激活状态 */
.btn-active {
  background-color: rgba(var(--theme-color-rgb), 0.1);
  color: var(--theme-color);
  border-color: var(--theme-color);
}

/* 导入卡片样式 */
.import-card {
  margin-bottom: 24px;
  overflow: hidden;
  will-change: transform, opacity;
  transform-origin: top center;
  contain: content;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  will-change: opacity, transform;
  backface-visibility: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: transparent;
  border: none;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    transform: rotate(90deg);
    
    .close-icon::before,
    .close-icon::after {
      background-color: var(--theme-color);
    }
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.2);
  }
  
  .close-icon {
    position: relative;
    width: 20px;
    height: 20px;
    
    &::before,
    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 2px;
      background-color: var(--secondary-text-color);
      border-radius: 2px;
      top: 50%;
      left: 0;
      transition: background-color 0.2s ease;
    }
    
    &::before {
      transform: translateY(-50%) rotate(45deg);
    }
    
    &::after {
      transform: translateY(-50%) rotate(-45deg);
    }
  }
}

.import-action {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 10px;
  cursor: pointer;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  margin-bottom: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(var(--theme-color-rgb), 0.1);
    transform: translateY(-2px);
  }
  
  .import-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    border-radius: 10px;
    margin-right: 16px;
    background-color: rgba(var(--theme-color-rgb), 0.1);
    color: var(--theme-color);
  }
  
  .import-content {
    flex: 1;
    
    .import-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .import-desc {
      font-size: 13px;
      color: var(--secondary-text-color);
    }
  }
}

.copy-action .import-icon {
  background-color: rgba(25, 113, 194, 0.1);
  color: #1971c2;
}

.qrcode-action .import-icon {
  background-color: rgba(64, 192, 87, 0.1);
  color: #40c057;
}

.platform-section {
  margin-bottom: 24px;
  
  .platform-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(var(--theme-color-rgb), 0.1);
  }
  
  .platform-options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    
    .platform-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      border-radius: 10px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: rgba(var(--theme-color-rgb), 0.1);
        transform: translateY(-3px);
        border-color: var(--theme-color);
      }
      
      svg {
        margin-bottom: 8px;
        color: var(--theme-color);
      }
      
      span {
        font-size: 14px;
      }
    }
  }
}

/* QR码模态窗口 */
.qrcode-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.qrcode-modal {
  background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--theme-color-rgb), 0.15);
  width: 90%;
  max-width: 360px;
  overflow: hidden;
  animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
  }
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.qrcode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(var(--theme-color-rgb), 0.03);
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-color);
    font-weight: 600;
  }
}

.qrcode-content {
  padding: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, rgba(var(--theme-color-rgb), 0.02), transparent);
  
  img {
    width: 220px;
    height: 220px;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    background-color: white;
    padding: 15px;
    object-fit: cover;
    transition: box-shadow 0.3s ease;
    
    &:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }
  }
  
  .qrcode-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 25px;
    min-height: 220px;
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(var(--theme-color-rgb), 0.2);
      border-radius: 50%;
      border-top-color: var(--theme-color);
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 15px;
    }
    
    p {
      font-size: 15px;
      color: var(--secondary-text-color);
      font-weight: 500;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .platform-options {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .import-action {
    padding: 12px;
    
    .import-icon {
      width: 40px;
      height: 40px;
    }
  }
}

/* 平台选择器 */
.platform-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
  
  .platform-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-color);
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      transform: translateY(-1px);
      border-color: rgba(var(--theme-color-rgb), 0.2);
    }
    
    &.active {
      background-color: rgba(var(--theme-color-rgb), 0.15);
      color: var(--theme-color);
      border-color: var(--theme-color);
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(var(--theme-color-rgb), 0.2);
    }
    
    svg {
      color: var(--theme-color);
      opacity: 0.8;
    }
  }
}

/* 客户端图标样式 */
.client-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  margin-bottom: 8px;
  object-fit: cover;
}

.platform-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 10px;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  
  svg {
    margin-bottom: 8px;
    color: var(--theme-color);
  }
  
  span {
    font-size: 14px;
  }
}

/* 警告和危险状态的卡片样式 */
.stats-card.warning-card {
  border-color: #ff9800;
  box-shadow: 0 4px 10px rgba(255, 152, 0, 0.15);
  
  .stats-icon {
    background-color: rgba(255, 152, 0, 0.1);
    color: #ff9800;
  }
  
  .stats-value {
    color: #ff9800;
  }
}

.stats-card.danger-card {
  border-color: #f44336;
  box-shadow: 0 4px 10px rgba(244, 67, 54, 0.15);
  
  .stats-icon {
    background-color: rgba(244, 67, 54, 0.1);
    color: #f44336;
  }
  
  .stats-value {
    color: #f44336;
  }
}

/* 没有套餐时的提示卡片样式 */
.stats-card.no-plan-card {
  border-color: #ff9800;
  box-shadow: 0 4px 10px rgba(255, 152, 0, 0.15);
  background: linear-gradient(145deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.1) 100%);
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.no-plan-content {
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
  z-index: 1;
}

.no-plan-icon {
  background-color: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 12px rgba(255, 152, 0, 0.1);
  flex-shrink: 0;
  transform: rotate(-5deg);
  transition: all 0.3s ease;
}

.no-plan-card:hover .no-plan-icon {
  transform: rotate(0deg) scale(1.05);
}

.no-plan-message {
  flex: 1;
}

.no-plan-title {
  color: #ff9800;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
  line-height: 1.4;
}

.no-plan-actions {
  display: flex;
  align-items: center;
  gap: 12px; /* 增加按钮之间的间距 */
}

.no-plan-actions .action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.no-plan-actions .action-button.primary {
  background-color: var(--theme-color);
  color: white;
  border: none;
  box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.3);
}

.no-plan-actions .action-button.primary:hover {
  background-color: var(--theme-hover-color);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.4);
}

.no-plan-actions .action-button.secondary {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.no-plan-actions .action-button.secondary:hover {
  background-color: rgba(var(--theme-color-rgb), 0.08);
  color: var(--theme-color);
  border-color: var(--theme-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.2);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .no-plan-content {
    flex-direction: column;
    text-align: center;
    align-items: center;
    gap: 16px;
    width: 100%;
  }
  
  .no-plan-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    text-align: center;
  }
  
  .no-plan-actions {
    justify-content: center;
    width: 100%;
    gap: 10px;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .no-plan-actions .action-button {
    padding: 8px 15px;
    min-width: 120px;
    justify-content: center;
  }
  
  .stats-card.no-plan-card {
    padding: 15px 12px;
  }
}

/* 小屏幕下的额外优化 */
@media (max-width: 480px) {
  .no-plan-content {
    padding: 5px;
    width: 100%;
  }
  
  .no-plan-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    margin: 0 auto;
  }
  
  .no-plan-icon .icon-cart {
    width: 32px;
    height: 32px;
  }
  
  .no-plan-title {
    font-size: 1rem;
    margin-bottom: 10px;
    width: 100%;
    text-align: center;
  }
  
  .no-plan-message {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .no-plan-actions {
    gap: 10px;
    width: 100%;
    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .no-plan-actions .action-button {
    padding: 10px 15px;
    font-size: 14px;
    justify-content: center;
    width: 80%;
    max-width: 200px;
  }
  
  .no-plan-actions .action-button .btn-icon {
    width: 14px;
    height: 14px;
    margin-right: 4px;
  }
  
  .stats-card.no-plan-card {
    padding: 15px 10px;
  }
}

/* 添加装饰元素 */
.no-plan-card::before {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 152, 0, 0.08);
  z-index: 0;
}

.no-plan-card::after {
  content: '';
  position: absolute;
  bottom: -30px;
  left: -30px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: rgba(255, 152, 0, 0.05);
  z-index: 0;
}

/* 骨架屏样式 */
.skeleton-card {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 2s infinite;
    z-index: 1;
  }
}

/* 骨架屏子元素样式 */
.skeleton-header {
  height: 24px;
  margin-bottom: 20px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  width: 30%;
  margin: 16px 20px;
  position: relative;
}

.skeleton-body {
  padding: 0 20px 20px;
}

.skeleton-row {
  height: 16px;
  margin-bottom: 16px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  width: 100%;
  position: relative;
}

.skeleton-row:last-child {
  width: 75%;
  margin-bottom: 0;
}

/* 暗色模式下的骨架屏调整 */
.dark-theme .skeleton-header,
.dark-theme .skeleton-row,
.dark-theme .skeleton-circle,
.dark-theme .skeleton-row-sm,
.dark-theme .skeleton-row-xs {
  background-color: rgba(255, 255, 255, 0.08);
}

/* 骨架屏图标样式 */
.skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  margin-right: 16px;
  flex-shrink: 0;
  position: relative;
}

.skeleton-content {
  flex: 1;
  position: relative;
}

.skeleton-row-sm {
  height: 16px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  width: 80%;
  margin-bottom: 10px;
  position: relative;
}

.skeleton-row-xs {
  height: 12px;
  background-color: var(--skeleton-bg, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  width: 50%;
  position: relative;
}

/* 骨架屏卡片布局 */
.stats-card.skeleton-card {
  display: flex;
  align-items: center;
  padding: 16px;
  animation: none;
  background-color: var(--card-bg-color);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  position: relative;
}

.stats-card.skeleton-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0.5) 60%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 2s infinite;
  z-index: 1;
}

.import-action .import-content .import-desc {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.4;
}

.no-clients-message {
  padding: 20px;
  text-align: center;
  background-color: rgba(var(--theme-color-rgb), 0.05);
  border-radius: 12px;
  margin: 10px 0;
  border: 1px dashed rgba(var(--theme-color-rgb), 0.3);
}

.no-clients-message p {
  color: var(--text-color);
  font-size: 14px;
  margin: 0;
}

/* 平台选择器 */
.platform-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
  
  .platform-button {
    display: flex;
    align-items: center;
    gap: 6px;
    background-color: rgba(var(--theme-color-rgb), 0.05);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-color);
    
    &:hover {
      background-color: rgba(var(--theme-color-rgb), 0.1);
      transform: translateY(-1px);
      border-color: rgba(var(--theme-color-rgb), 0.2);
    }
    
    &.active {
      background-color: rgba(var(--theme-color-rgb), 0.15);
      color: var(--theme-color);
      border-color: var(--theme-color);
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(var(--theme-color-rgb), 0.2);
    }
    
    svg {
      color: var(--theme-color);
      opacity: 0.8;
    }
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .stats-card.no-plan-card {
    padding: 25px 30px;
  }
  
  .no-plan-content {
    gap: 30px;
  }
  
  .no-plan-title {
    font-size: 1.3rem;
  }
  
  .no-plan-actions .action-button {
    padding: 12px 22px;
    font-size: 16px;
  }
}

/* 默认样式（电脑端） */
.no-plan-actions {
  display: flex;
  align-items: center;
  gap: 12px; /* 增加按钮之间的间距 */
}

.no-plan-actions .action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* 确保移动端优化只应用于小屏幕 */
@media screen and (min-width: 769px) {
  .no-plan-content {
    display: flex;
    align-items: center;
    gap: 24px;
    position: relative;
    z-index: 1;
    flex-direction: row; /* 确保大屏幕上是水平布局 */
  }
  
  .no-plan-message {
    flex: 1;
    text-align: left; /* 确保文本左对齐 */
    align-items: flex-start; /* 确保子元素左对齐 */
    width: auto; /* 重置宽度 */
  }
  
  .no-plan-title {
    text-align: left; /* 确保标题左对齐 */
    width: auto; /* 重置宽度 */
  }
  
  .no-plan-actions {
    justify-content: flex-start; /* 确保按钮左对齐 */
    width: auto; /* 重置宽度 */
    flex-direction: row; /* 确保水平排列按钮 */
  }
  
  .no-plan-actions .action-button {
    width: auto; /* 重置宽度 */
    max-width: none; /* 重置最大宽度 */
  }
}

/* 公告弹窗 */
.notice-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  backdrop-filter: blur(4px);
}

.notice-modal {
  width: 100%;
  max-width: 500px;
  background-color: rgba(var(--card-background-rgb, 255, 255, 255), 1);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(var(--theme-color-rgb), 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  
  @media (prefers-color-scheme: dark) {
    background-color: rgba(var(--card-background-rgb, 30, 30, 30), 1);
  }
}

.notice-modal-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(var(--theme-color-rgb), 0.03);
  
  .popup-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color);
  }
  
  .popup-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--secondary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    margin: -8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--text-color);
      transform: rotate(90deg);
    }
  }
}

.notice-modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background: linear-gradient(to bottom, rgba(var(--theme-color-rgb), 0.02), transparent);
  
  .notice-content {
    font-size: 14px;
    line-height: 1.6;
    
    :deep(p) {
      margin: 12px 0;
      line-height: 1.6;
      color: var(--text-color);
    }
    
    :deep(strong) {
      color: var(--theme-color);
      font-weight: 600;
    }
    
    :deep(a) {
      color: var(--theme-color);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
    
    :deep(img) {
      max-width: 100%;
      height: auto;
      margin: 10px 0;
      border-radius: 8px;
    }
    
    :deep(ul), :deep(ol) {
      padding-left: 20px;
      margin-bottom: 16px;
      
      li {
        margin-bottom: 8px;
        list-style-position: outside;
      }
    }
    
    :deep(ul) li {
      list-style-type: disc;
    }
    
    :deep(ol) li {
      list-style-type: decimal;
    }
    
    :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    :deep(blockquote) {
      border-left: 4px solid var(--theme-color);
      padding: 10px 15px;
      margin: 16px 0;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      border-radius: 0 6px 6px 0;
      
      p {
        margin: 8px 0;
      }
    }
    
    :deep(code) {
      font-family: monospace;
      background-color: rgba(var(--theme-color-rgb), 0.1);
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    
    :deep(pre) {
      background-color: rgba(var(--theme-color-rgb), 0.05);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 16px 0;
      
      code {
        background-color: transparent;
        padding: 0;
      }
    }
    
    :deep(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      
      th, td {
        border: 1px solid var(--border-color);
        padding: 8px 12px;
        text-align: left;
      }
      
      th {
        background-color: rgba(var(--theme-color-rgb), 0.05);
        font-weight: 600;
      }
      
      tr:nth-child(even) {
        background-color: rgba(var(--theme-color-rgb), 0.02);
      }
    }
    
    :deep(a.eztheme-btn) {
      display: inline-block;
      padding: 8px 16px;
      background-color: var(--theme-color);
      color: white;
      border-radius: 8px;
      margin: 10px 0;
      text-decoration: none;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: var(--primary-color-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(var(--theme-color-rgb), 0.3);
      }
    }
  }
}

.notice-modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  
  .popup-action-btn {
    padding: 8px 20px;
    background-color: var(--theme-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 120px;
    
    &.adaptive-btn {
      min-width: auto;
      padding: 8px 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.3);
    }
    
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      background-color: var(--secondary-text-color);
    }
  }
}

// 弹窗动画
.popup-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.popup-slide-leave-active {
  transition: all 0.2s ease-out;
}

.popup-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

.popup-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 响应式 */
@media (max-width: 768px) {
  .notice-modal-overlay {
    padding: 15px;
    
    .notice-modal {
      max-width: 100%;
      max-height: 85vh;
      
      .notice-modal-header {
        padding: 15px;
        
        .popup-title {
          font-size: 16px;
        }
      }
      
      .notice-modal-content {
        padding: 15px;
      }
      
      .notice-modal-footer {
        padding: 12px 15px;
      }
    }
  }
}

/* 重置流量弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-card {
  background-color: var(--card-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reset-traffic-modal {
  .modal-header {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color);
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--secondary-text-color);
      cursor: pointer;
      padding: 0;
      
      &:hover {
        color: var(--text-color);
      }
    }
  }
  
  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .warning-icon {
      margin-bottom: 16px;
      color: #ff9800;
    }
    
    .warning-text {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 12px;
      text-align: center;
      color: var(--text-color);
    }
    
    .note-text {
      font-size: 14px;
      color: var(--secondary-text-color);
      text-align: center;
      margin-bottom: 0;
      padding: 8px 12px;
      background-color: rgba(var(--theme-color-rgb), 0.05);
      border-radius: 6px;
      width: 100%;
    }
  }
  
  .modal-footer {
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid var(--border-color);
    
    button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none !important;
      }
    }
    
    .cancel-btn {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      
      &:hover:not(:disabled) {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
    
    .confirm-btn {
      background-color: #f44336;
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background-color: #e53935;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
      }
    }
  }
}

/* 模态框动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* 加载动画样式 */
.loader-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 2px solid #fff;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

/* 加载容器样式 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 全局样式，不受scoped限制 */
</style>

<!-- 全局样式，不受scoped限制 -->
<style lang="scss">
/* 警告和危险状态的卡片样式 */
.stats-card.warning-card {
  border-color: #ff9800 !important;
  box-shadow: 0 4px 10px rgba(255, 152, 0, 0.15) !important;
  
  .stats-icon {
    background-color: rgba(255, 152, 0, 0.1) !important;
    color: #ff9800 !important;
  }

  .stats-value {
    color: #ff9800 !important;
  }
}

.stats-card.danger-card {
  border-color: #f44336 !important;
  box-shadow: 0 4px 10px rgba(244, 67, 54, 0.15) !important;
  
  .stats-icon {
    background-color: rgba(244, 67, 54, 0.1) !important;
    color: #f44336 !important;
  }

  .stats-value {
    color: #f44336 !important;
  }
}

/* 在markdown或HTML内容中的按钮样式 */
.eztheme-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  background-color: rgba(var(--theme-color-rgb), 0.1) !important;
  color: var(--theme-color) !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  font-weight: 500 !important;
  margin: 8px 0 !important;
  text-decoration: none !important;
  border-bottom: none !important;
  text-align: center !important;
  box-shadow: none !important;
  border-color: transparent !important;
  width: auto !important;
  
  &:hover, &:active, &:focus, &:visited {
    background-color: rgba(var(--theme-color-rgb), 0.2) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 8px rgba(var(--theme-color-rgb), 0.1) !important;
    border-bottom: none !important;
    text-decoration: none !important;
    color: var(--theme-color) !important;
    border-color: transparent !important;
  }
  
  &:active {
    transform: translateY(0) !important;
    box-shadow: none !important;
  }
  
  &:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.3) !important;
  }
}

/* 重置Markdown引擎可能添加的链接样式 */
a.eztheme-btn {
  background-image: none !important;
  background-repeat: no-repeat !important;
  background-position: initial !important;
  background-size: initial !important;
  text-decoration: none !important;
  border-bottom: none !important;
  
  &::after, &::before {
    display: none !important;
    content: none !important;
  }
}

/* 添加余额卡片样式 */
/* 余额卡片特殊样式 */
.stats-card.balance-card.clickable {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stats-card.balance-card.clickable:hover {
  background-color: rgba(var(--theme-color-rgb), 0.08);
  transform: translateY(-3px);
}

.stats-card.balance-card .stats-value {
  color: var(--theme-color);
}
</style>

