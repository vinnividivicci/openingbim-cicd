import * as BUI from "@thatopen/ui";
import { createLandingPage } from "./pages/LandingPage";
import { initializeViewer, loadFragmentFromAPI, loadValidationResults, showViewer, hideViewer } from "./pages/ViewerPage";
import "./styles/landing-page.css";

BUI.Manager.init();

// Simple Router Implementation
class Router {
  private routes: Map<string, () => Promise<void>> = new Map();
  private currentRoute: string = '';
  private landingPage: HTMLElement | null = null;
  private appContainer: HTMLElement | null = null;
  private landingPageUnsubscribe: (() => void) | null = null;

  constructor() {
    this.appContainer = document.getElementById('app');
    window.addEventListener('hashchange', () => this.handleRouteChange());
  }

  register(path: string, handler: () => Promise<void>) {
    this.routes.set(path, handler);
  }

  async navigate(path: string) {
    window.location.hash = path;
  }

  private async handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');
    this.currentRoute = path;

    // Parse query parameters
    const params = new URLSearchParams(queryString || '');

    // Hide all content first
    if (this.landingPage) {
      this.landingPage.style.display = 'none';
    }
    if (this.appContainer) {
      this.appContainer.style.display = 'none';
    }

    // Handle routes
    if (path === '/' || path === '/landing') {
      await this.showLanding();
    } else if (path === '/viewer') {
      await this.showViewer(params);
    } else {
      // Default to landing page
      await this.showLanding();
    }
  }

  private async showLanding() {
    if (!this.landingPage) {
      const { landingPage, unsubscribe } = createLandingPage();
      this.landingPage = landingPage;
      this.landingPageUnsubscribe = unsubscribe;
      document.body.appendChild(this.landingPage);
    }
    this.landingPage.style.display = 'block';
    hideViewer();
  }

  private async showViewer(params: URLSearchParams) {
    // Hide landing page
    if (this.landingPage) {
      this.landingPage.style.display = 'none';
    }

    // Initialize viewer if needed
    await initializeViewer();
    showViewer();

    // Load model if specified
    const modelId = params.get('model');
    if (modelId) {
      await loadFragmentFromAPI(modelId);
    }

    // Load validation results if specified
    const resultsId = params.get('results');
    if (resultsId) {
      await loadValidationResults(resultsId);
    }
  }

  async init() {
    await this.handleRouteChange();
  }
}

// Initialize router and set up routes
const router = new Router();

// Initialize the application
async function initApp() {
  console.log('Initializing BIM IDS Validator...');

  // Set default route if no hash is present
  if (!window.location.hash) {
    window.location.hash = '/landing';
  }

  // Initialize router
  await router.init();

  console.log('Application initialized');
}

// Start the application
initApp().catch(console.error);
