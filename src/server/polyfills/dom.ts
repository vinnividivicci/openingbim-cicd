/**
 * Minimal DOM polyfills for @thatopen/components IDS validation in Node.js
 * These polyfills provide just enough DOM API to allow IDS validation without rendering
 */

export function setupDOMPolyfills(): void {
  // Document polyfill - minimal implementation for IDS
  if (!global.document) {
    (global as any).document = {
      createElement: (tagName: string) => {
        // Return a mock element that satisfies basic requirements
        return {
          tagName: tagName.toUpperCase(),
          style: {},
          setAttribute: () => {},
          getAttribute: () => null,
          appendChild: () => {},
          removeChild: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
          },
        };
      },
      createElementNS: (namespace: string, tagName: string) => {
        return (global as any).document.createElement(tagName);
      },
      createTextNode: (text: string) => ({
        nodeValue: text,
        nodeType: 3,
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
        style: {},
      },
      head: {
        appendChild: () => {},
        removeChild: () => {},
      },
      documentElement: {
        style: {},
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }

  // Window polyfill - minimal implementation
  if (!global.window) {
    (global as any).window = {
      document: (global as any).document,
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame: (callback: Function) => setTimeout(callback, 16),
      cancelAnimationFrame: (id: number) => clearTimeout(id),
      devicePixelRatio: 1,
      innerWidth: 1024,
      innerHeight: 768,
    };
  }

  // Also add requestAnimationFrame to global
  if (!global.requestAnimationFrame) {
    (global as any).requestAnimationFrame = (callback: Function) => setTimeout(callback, 16);
    (global as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
  }

  // Event polyfill
  if (!global.Event) {
    (global as any).Event = class Event {
      type: string;
      bubbles: boolean;
      cancelable: boolean;
      defaultPrevented: boolean = false;

      constructor(type: string, options?: any) {
        this.type = type;
        this.bubbles = options?.bubbles || false;
        this.cancelable = options?.cancelable || false;
      }

      preventDefault() {
        this.defaultPrevented = true;
      }

      stopPropagation() {}
      stopImmediatePropagation() {}
    };
  }

  // CustomEvent polyfill
  if (!global.CustomEvent) {
    (global as any).CustomEvent = class CustomEvent extends (global as any).Event {
      detail: any;

      constructor(type: string, options?: any) {
        super(type, options);
        this.detail = options?.detail;
      }
    };
  }

  // HTMLElement polyfill
  if (!global.HTMLElement) {
    (global as any).HTMLElement = class HTMLElement {
      style: any = {};
      classList = {
        add: () => {},
        remove: () => {},
        contains: () => false,
      };
      setAttribute() {}
      getAttribute() { return null; }
      appendChild() {}
      removeChild() {}
      addEventListener() {}
      removeEventListener() {}
    };
  }

  // HTMLCanvasElement polyfill - returns null context since we don't need rendering
  if (!global.HTMLCanvasElement) {
    (global as any).HTMLCanvasElement = class HTMLCanvasElement extends (global as any).HTMLElement {
      width: number = 1024;
      height: number = 768;

      getContext(contextType: string) {
        // Return null to indicate WebGL is not available
        // This should force components to skip rendering
        return null;
      }

      toDataURL() {
        return 'data:image/png;base64,';
      }
    };
  }

  // Blob polyfill for Node.js
  if (!global.Blob) {
    (global as any).Blob = class Blob {
      constructor(public parts: any[], public options?: any) {
        this.size = parts.reduce((acc, part) => acc + (part.length || part.size || 0), 0);
        this.type = options?.type || '';
      }
      size: number = 0;
      type: string = '';
    };
  }

  // URL.createObjectURL polyfill
  if (!global.URL || !global.URL.createObjectURL) {
    const url = global.URL || {};
    (global as any).URL = {
      ...url,
      createObjectURL: (blob: any) => 'blob:' + Math.random().toString(36).substr(2, 9),
      revokeObjectURL: (url: string) => {}
    };
  }

  console.log('DOM polyfills initialized for IDS validation');
}

// Initialize DOM polyfills when module is imported
setupDOMPolyfills();