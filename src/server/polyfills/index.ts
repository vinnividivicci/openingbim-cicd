import fetch from 'node-fetch';

// Minimal polyfills for Node.js environment
// Only what's needed for web-ifc and @thatopen/fragments
export function setupPolyfills(): void {
  // Setup fetch for web-ifc
  if (!global.fetch) {
    (global as any).fetch = fetch;
    (global as any).Headers = (fetch as any).Headers;
    (global as any).Request = (fetch as any).Request;
    (global as any).Response = (fetch as any).Response;
  }

  // Setup performance (used by web-ifc)
  if (!global.performance) {
    (global as any).performance = {
      now: () => Date.now(),
    };
  }

  console.log('Minimal polyfills initialized for Node.js environment');
}

// Initialize polyfills when module is imported
setupPolyfills();