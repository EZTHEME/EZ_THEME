# EZ_THEME
EZ THEME: A theme for V2Board / wyxBoard / XBoard

# V2Board User 前端项目

一个美观、现代的V2Board管理后台前端项目，基于Vue 3开发。

## 特性

-  美观的UI设计，简约高端
-  支持亮色/暗色主题切换
-  内置国际化支持（中文/英文）
-  响应式设计，适配各种设备
-  完善的登录认证系统
-  模块化的代码结构，易于维护

## 技术栈

- Vue 3 - 渐进式JavaScript框架
- Vue Router - 官方路由管理器
- Vuex - 状态管理模式
- Axios - 基于Promise的HTTP客户端
- Sass - CSS预处理器
- Vue I18n - 国际化解决方案

## 项目结构

```
src/
├── api/                # API接口
├── assets/             # 静态资源
│   └── styles/         # 样式文件
│       ├── base/       # 基础样式
│       ├── components/ # 组件样式
│       └── layouts/    # 布局样式
├── components/         # 公共组件
├── composables/        # 组合式API
├── i18n/               # 国际化
│   └── locales/        # 语言包
├── router/             # 路由配置
├── store/              # Vuex存储
├── utils/              # 工具函数
└── views/              # 页面视图
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run serve
```

### 生产环境构建

```bash
npm run build
```

## 自定义配置

### 主题配置

主题颜色和其他配置可以在 `src/utils/baseConfig.js` 文件中修改。

### API配置

API基础URL可以在 `src/utils/baseConfig.js` 文件中修改。

## 浏览器支持

- Chrome
- Firefox
- Safari
- Edge
- 其他现代浏览器


====================================================


## 域名授权保护概述

项目中实现了严格的域名授权检测机制，确保只有授权的域名才能正常访问前端应用。未授权域名访问时会导致页面"卡死"，有效防止未经许可的网站托管您的前端代码。

## 核心文件及功能

### 1. 域名白名单配置
**文件路径:** `src/utils/baseConfig.js`

这个文件包含了授权域名的白名单列表：

```javascript
// 授权的前端域名列表
export const AUTHORIZED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  // 在此处添加您授权的其他域名
];
```

这里您可以添加所有被授权访问您应用的域名。默认已包含本地开发常用的`localhost`和`127.0.0.1`

### 2. 安全功能配置
**文件路径:** `src/utils/baseConfig.js`

从现在开始，您可以使用安全配置选项来轻松启用或禁用各种安全功能，而无需删除代码：

```javascript
/**
 * 安全配置选项
 * 可以通过这些选项轻松启用或禁用各种安全功能
 */
export const SECURITY_CONFIG = {
  // 是否启用前端域名验证（前端域名检查，防止未授权域名访问）
  enableFrontendDomainCheck: true,
  
  // 是否启用API域名验证（API域名检查，防止接口被盗用）
  enableApiDomainCheck: true,
  
  // 是否启用反调试功能（阻止开发者工具和F12调试）
  enableAntiDebugging: true
};
```

如果您不想使用某项安全功能，只需将对应的选项设置为`false`即可，无需删除代码。

### 3. 域名检测逻辑
**文件路径:** `src/utils/domainChecker.js`

这个文件包含两个关键函数：

#### 检查域名是否授权
```javascript
export const isDomainAuthorized = () => {
  const currentDomain = window.location.hostname;
  return AUTHORIZED_DOMAINS.includes(currentDomain);
};
```
该函数获取当前访问的域名，并检查它是否在授权列表中。

#### 处理未授权域名
```javascript
export const handleUnauthorizedDomain = () => {
  if (!isDomainAuthorized()) {
    console.clear(); // 清除控制台
    
    // 阻止页面继续加载和交互，实现"卡死"效果
    const blockUI = () => {
      // 创建一个覆盖整个页面的元素
      const blocker = document.createElement('div');
      blocker.style.position = 'fixed';
      blocker.style.top = '0';
      blocker.style.left = '0';
      blocker.style.width = '100%';
      blocker.style.height = '100%';
      blocker.style.backgroundColor = '#ffffff';
      blocker.style.zIndex = '999999';
      document.body.appendChild(blocker);
      
      // 阻止所有用户交互
      document.body.style.overflow = 'hidden';
      
      // 禁用所有事件
      const disableEvents = (e) => {
        e.stopPropagation();
        e.preventDefault();
        return false;
      };
      
      // 捕获所有事件
      ['click', 'contextmenu', 'mousedown', 'mouseup', 'touchstart', 
       'touchend', 'keydown', 'keyup', 'keypress', 'scroll', 'wheel'].forEach(eventType => {
        document.addEventListener(eventType, disableEvents, { capture: true });
      });
      
      // 无限循环消耗资源，造成"卡死"效果
      const startLoop = () => {
        let arr = [];
        while (true) {
          arr.push(new Array(10000).fill('x').join(''));
          if (arr.length > 1000) arr = [];
        }
      };
      
      // 启动资源消耗循环
      setTimeout(startLoop, 500);
    };
    
    // 执行阻塞
    blockUI();
    
    return false;
  }
  
  return true;
};
```

这个函数是核心防护逻辑：
- 如果域名未授权，会执行以下操作：
  1. 清除控制台内容
  2. 创建一个全屏白色遮罩，阻止用户看到任何内容
  3. 禁用所有用户交互和事件（点击、滚动、触摸等）
  4. 启动一个无限循环，消耗系统资源，导致页面"卡死"
  5. 实际上形成了一种"白屏死锁"状态

### 4. 应用初始化时的域名检测
**文件路径:** `src/main.js`

在应用初始化的早期阶段执行域名检测：

```javascript
// 导入域名检查工具
import { handleUnauthorizedDomain } from './utils/domainChecker';
import { SECURITY_CONFIG } from './utils/baseConfig';

// 检查域名授权状态
// 如果域名未授权，将导致页面无法正常加载
// 注意：可以在 baseConfig.js 中设置 SECURITY_CONFIG.enableFrontendDomainCheck = false 来禁用此功能
if (!handleUnauthorizedDomain()) {
  // 未授权域名将在handleUnauthorizedDomain内部处理
  throw new Error('Unauthorized domain');
}
```

这段代码确保在应用其他部分初始化之前就完成域名检测，如果域名未授权，立即触发防护措施。

## 工作原理

1. 当用户访问您的网站时，`main.js`作为入口点最先执行
2. 首先检查`SECURITY_CONFIG.enableFrontendDomainCheck`是否启用
3. 如果启用了域名检查，它会调用`handleUnauthorizedDomain()`检查当前域名
4. `handleUnauthorizedDomain()`函数通过`isDomainAuthorized()`检查当前域名是否在白名单中
5. 如果域名未授权，执行`blockUI()`函数：
   - 创建白色全屏遮罩
   - 禁用所有用户交互
   - 启动资源消耗循环
   - 页面完全"卡死"
6. 如果域名授权，应用继续正常初始化和运行

## 如何配置安全功能

### 方式一: 使用配置选项（推荐）

1. 编辑`src/utils/baseConfig.js`文件
2. 修改`SECURITY_CONFIG`对象中的选项：
   ```javascript
   export const SECURITY_CONFIG = {
     // 设置为false可禁用前端域名验证
     enableFrontendDomainCheck: false,
     
     // 设置为false可禁用API域名验证
     enableApiDomainCheck: false,
     
     // 设置为false可禁用反调试功能
     enableAntiDebugging: false
   };
   ```
3. 保存文件并重新构建应用

### 方式二: 添加或修改授权域名

1. 编辑`src/utils/baseConfig.js`文件
2. 在`AUTHORIZED_DOMAINS`数组中添加您授权的所有域名
3. 保存文件并重新构建应用
4. 未列入的域名将无法正常访问您的应用

## 注意事项

1. 务必将您的开发域名（如`localhost`、`127.0.0.1`）保留在授权列表中，否则开发时将无法访问应用
2. 如需在多个域名下部署同一应用，请将所有这些域名添加到白名单
3. 域名检测是基于`window.location.hostname`，不包含协议（http/https）和端口号
4. 此保护机制与代码混淆和反调试措施协同工作，共同提供多层次的前端安全保护

## 安全考量

此域名授权检测机制是前端安全的重要组成部分，但请记住：
- 它主要目的是阻止简单的前端代码复制和未授权托管
- 对于确实关键的业务逻辑，应当放在后端处理
- 如您的应用包含敏感数据或功能，建议实施更全面的安全措施


1.如果不需要加密功能，需要删除的代码：
删除webpack-obfuscator依赖:
   npm uninstall javascript-obfuscator webpack-obfuscator

2.修改vue.config.js:
删除下面两行导入语句:
     const JavaScriptObfuscator = require('javascript-obfuscator');
     const WebpackObfuscator = require('webpack-obfuscator');

删除或注释掉整个WebpackObfuscator插件配置块(包含在if (process.env.NODE_ENV === 'production') 条件内的配置)

3.删除域名检测文件:
删除整个 src/utils/domainChecker.js 文件

4.删除反调试文件:
删除整个 src/utils/antiDebug.js 文件

5.从baseConfig.js中删除授权域名列表:
删除 AUTHORIZED_DOMAINS 常量定义

6.修改main.js:
删除这些导入语句:
     import { handleUnauthorizedDomain } from './utils/domainChecker';
     import { initAntiDebug } from './utils/antiDebug';
删除域名检测和反调试初始化代码:
     if (!handleUnauthorizedDomain()) {
       throw new Error('Unauthorized domain');
     }
     
     initAntiDebug();

通过上述删除操作，您将移除所有与代码加密、域名检测和反调试相关的功能，恢复到原始的未加密状态。应用将在任何域名上正常运行，且不会阻止开发者工具的使用。
