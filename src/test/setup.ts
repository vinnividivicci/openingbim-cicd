// Test setup file for vitest
// This file sets up the testing environment

// Mock Blob with text() method support
if (!globalThis.Blob.prototype.text) {
  globalThis.Blob.prototype.text = async function() {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsText(this)
    })
  }
}

// Mock DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock FileReader if needed
if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    result: string | ArrayBuffer | null = null
    error: any = null
    readyState: number = 0

    onload: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null

    readAsText(file: Blob) {
      setTimeout(() => {
        this.result = 'mock file content'
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    }

    readAsDataURL(file: Blob) {
      setTimeout(() => {
        this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ='
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    }

    readAsArrayBuffer(file: Blob) {
      setTimeout(() => {
        this.result = new ArrayBuffer(8)
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    }
  } as any
}