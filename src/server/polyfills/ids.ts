/**
 * Minimal polyfills specifically for IDS validation in Node.js
 * These polyfills provide just enough browser API to allow IDS validation
 * without requiring WebGL or rendering capabilities
 */

import fetch from 'node-fetch';

export function setupIDSPolyfills(): void {
  // Setup fetch for potential web-ifc usage
  if (!global.fetch) {
    (global as any).fetch = fetch;
    (global as any).Headers = (fetch as any).Headers;
    (global as any).Request = (fetch as any).Request;
    (global as any).Response = (fetch as any).Response;
  }

  // Setup performance (used by web-ifc and fragments)
  if (!global.performance) {
    (global as any).performance = {
      now: () => Date.now(),
    };
  }

  // Blob polyfill for Node.js (needed for worker creation attempts)
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

  // URL.createObjectURL polyfill (for worker URLs)
  if (!global.URL || !global.URL.createObjectURL) {
    const url = global.URL || {};
    (global as any).URL = {
      ...url,
      createObjectURL: (blob: any) => 'blob:' + Math.random().toString(36).substr(2, 9),
      revokeObjectURL: (url: string) => {},
    };
  }

  // Minimal document polyfill - only what's needed for IDS
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
    };
  }

  // Minimal window polyfill - only what's needed for IDS
  if (!global.window) {
    (global as any).window = {
      document: (global as any).document,
      addEventListener: () => {},
      removeEventListener: () => {},
      // We intentionally DO NOT add requestAnimationFrame
      // to prevent Components from starting render loop
      devicePixelRatio: 1,
      innerWidth: 1024,
      innerHeight: 768,
    };
  }

  // Event polyfill (minimal)
  if (!global.Event) {
    (global as any).Event = class Event {
      type: string;
      constructor(type: string, options?: any) {
        this.type = type;
      }
      preventDefault() {}
      stopPropagation() {}
    };
  }

  // CustomEvent polyfill (minimal)
  if (!global.CustomEvent) {
    (global as any).CustomEvent = class CustomEvent extends (global as any).Event {
      detail: any;
      constructor(type: string, options?: any) {
        super(type, options);
        this.detail = options?.detail;
      }
    };
  }

  console.log('IDS polyfills initialized for Node.js environment');
}

// Initialize polyfills when module is imported
setupIDSPolyfills();