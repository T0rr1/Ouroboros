export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  supportsWebGL: boolean;
  supportsWebAudio: boolean;
  supportsLocalStorage: boolean;
  supportsRequestAnimationFrame: boolean;
  supportsResizeObserver: boolean;
  supportsIntersectionObserver: boolean;
}

export interface CompatibilityFeatures {
  webgl: boolean;
  webAudio: boolean;
  localStorage: boolean;
  requestAnimationFrame: boolean;
  resizeObserver: boolean;
  intersectionObserver: boolean;
  touchEvents: boolean;
  pointerEvents: boolean;
  gamepadAPI: boolean;
  fullscreenAPI: boolean;
  visibilityAPI: boolean;
}

export class BrowserCompatibility {
  private browserInfo: BrowserInfo;
  private features: CompatibilityFeatures;
  private polyfills: Map<string, boolean> = new Map();

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.features = this.detectFeatures();
    this.setupPolyfills();
  }

  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let name = 'Unknown';
    let version = '0';
    let engine = 'Unknown';
    
    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '0';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '0';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : '0';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : '0';
      engine = 'Blink';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      name = 'Opera';
      const match = userAgent.match(/(Opera|OPR)\/(\d+)/);
      version = match ? match[2] : '0';
      engine = 'Blink';
    }
    
    // Detect device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = isMobile && /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    return {
      name,
      version,
      engine,
      platform,
      isMobile,
      isTablet,
      supportsWebGL: this.testWebGLSupport(),
      supportsWebAudio: this.testWebAudioSupport(),
      supportsLocalStorage: this.testLocalStorageSupport(),
      supportsRequestAnimationFrame: this.testRequestAnimationFrameSupport(),
      supportsResizeObserver: this.testResizeObserverSupport(),
      supportsIntersectionObserver: this.testIntersectionObserverSupport()
    };
  }

  private detectFeatures(): CompatibilityFeatures {
    return {
      webgl: this.testWebGLSupport(),
      webAudio: this.testWebAudioSupport(),
      localStorage: this.testLocalStorageSupport(),
      requestAnimationFrame: this.testRequestAnimationFrameSupport(),
      resizeObserver: this.testResizeObserverSupport(),
      intersectionObserver: this.testIntersectionObserverSupport(),
      touchEvents: 'ontouchstart' in window,
      pointerEvents: 'onpointerdown' in window,
      gamepadAPI: 'getGamepads' in navigator,
      fullscreenAPI: 'requestFullscreen' in document.documentElement,
      visibilityAPI: 'visibilityState' in document
    };
  }

  private testWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  private testWebAudioSupport(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  private testLocalStorageSupport(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  private testRequestAnimationFrameSupport(): boolean {
    return !!(window.requestAnimationFrame || 
             (window as any).webkitRequestAnimationFrame || 
             (window as any).mozRequestAnimationFrame);
  }

  private testResizeObserverSupport(): boolean {
    return typeof ResizeObserver !== 'undefined';
  }

  private testIntersectionObserverSupport(): boolean {
    return typeof IntersectionObserver !== 'undefined';
  }

  private setupPolyfills(): void {
    this.setupRequestAnimationFramePolyfill();
    this.setupPerformanceNowPolyfill();
    this.setupConsolePolyfill();
    this.setupArrayPolyfills();
    this.setupObjectPolyfills();
  }

  private setupRequestAnimationFramePolyfill(): void {
    if (!window.requestAnimationFrame) {
      let lastTime = 0;
      window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        const currTime = new Date().getTime();
        const timeToCall = Math.max(0, 16 - (currTime - lastTime));
        const id = window.setTimeout(() => {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
      this.polyfills.set('requestAnimationFrame', true);
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = (id: number) => {
        clearTimeout(id);
      };
    }
  }

  private setupPerformanceNowPolyfill(): void {
    if (!window.performance) {
      (window as any).performance = {};
    }

    if (!window.performance.now) {
      const startTime = Date.now();
      window.performance.now = () => {
        return Date.now() - startTime;
      };
      this.polyfills.set('performance.now', true);
    }
  }

  private setupConsolePolyfill(): void {
    if (!window.console) {
      (window as any).console = {
        log: () => {},
        warn: () => {},
        error: () => {},
        info: () => {},
        debug: () => {}
      };
      this.polyfills.set('console', true);
    }
  }

  private setupArrayPolyfills(): void {
    // Array.from polyfill
    if (!Array.from) {
      Array.from = (arrayLike: any, mapFn?: any, thisArg?: any) => {
        const items = Object(arrayLike);
        const len = parseInt(items.length) || 0;
        const result = new Array(len);
        
        for (let i = 0; i < len; i++) {
          result[i] = mapFn ? mapFn.call(thisArg, items[i], i) : items[i];
        }
        
        return result;
      };
      this.polyfills.set('Array.from', true);
    }

    // Array.includes polyfill
    if (!Array.prototype.includes) {
      Array.prototype.includes = function(searchElement: any, fromIndex?: number) {
        const len = this.length;
        const start = Math.max(fromIndex || 0, 0);
        
        for (let i = start; i < len; i++) {
          if (this[i] === searchElement) {
            return true;
          }
        }
        
        return false;
      };
      this.polyfills.set('Array.includes', true);
    }
  }

  private setupObjectPolyfills(): void {
    // Object.assign polyfill
    if (!Object.assign) {
      Object.assign = (target: any, ...sources: any[]) => {
        if (target == null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        const to = Object(target);

        for (let i = 0; i < sources.length; i++) {
          const nextSource = sources[i];
          if (nextSource != null) {
            for (const nextKey in nextSource) {
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }

        return to;
      };
      this.polyfills.set('Object.assign', true);
    }
  }

  public getBrowserInfo(): BrowserInfo {
    return { ...this.browserInfo };
  }

  public getFeatures(): CompatibilityFeatures {
    return { ...this.features };
  }

  public isFeatureSupported(feature: keyof CompatibilityFeatures): boolean {
    return this.features[feature];
  }

  public getPolyfills(): string[] {
    return Array.from(this.polyfills.keys()).filter(key => this.polyfills.get(key));
  }

  public isModernBrowser(): boolean {
    const { name, version } = this.browserInfo;
    const versionNum = parseInt(version);
    
    // Define minimum supported versions
    const minimumVersions: Record<string, number> = {
      'Chrome': 60,
      'Firefox': 55,
      'Safari': 12,
      'Edge': 79,
      'Opera': 47
    };
    
    return minimumVersions[name] ? versionNum >= minimumVersions[name] : false;
  }

  public getRecommendedSettings(): {
    useWebGL: boolean;
    useWebAudio: boolean;
    enableAdvancedFeatures: boolean;
    particleQuality: 'low' | 'medium' | 'high';
    enableTouchControls: boolean;
  } {
    const isModern = this.isModernBrowser();
    const { isMobile } = this.browserInfo;
    
    return {
      useWebGL: this.features.webgl && isModern,
      useWebAudio: this.features.webAudio,
      enableAdvancedFeatures: isModern && !isMobile,
      particleQuality: isMobile ? 'low' : isModern ? 'high' : 'medium',
      enableTouchControls: this.features.touchEvents || isMobile
    };
  }

  public logCompatibilityInfo(): void {
    console.group('Browser Compatibility Information');
    console.log('Browser:', this.browserInfo.name, this.browserInfo.version);
    console.log('Engine:', this.browserInfo.engine);
    console.log('Platform:', this.browserInfo.platform);
    console.log('Mobile:', this.browserInfo.isMobile);
    console.log('Modern Browser:', this.isModernBrowser());
    console.log('Features:', this.features);
    
    const polyfills = this.getPolyfills();
    if (polyfills.length > 0) {
      console.log('Active Polyfills:', polyfills);
    }
    
    console.log('Recommended Settings:', this.getRecommendedSettings());
    console.groupEnd();
  }
}