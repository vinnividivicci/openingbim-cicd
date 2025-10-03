import * as BUI from "@thatopen/ui";
import { conversionStateManager, ConversionState } from "../services/ConversionStateManager";
import {
  ifcUploadWrapper,
  fragmentConversionWrapper,
  idsUploadWrapper,
  viewResultsWrapper
} from "../components/steps/StepWrappers";

export interface LandingPageState {
  conversionState: ConversionState;
}

export const landingPageTemplate: BUI.StatefullComponent<LandingPageState> = (
  state,
  update
) => {
  // Subscribe to state changes
  if (!state.conversionState) {
    state.conversionState = conversionStateManager.getState();

    // Subscribe to updates
    conversionStateManager.subscribe((newState) => {
      update({ conversionState: newState });
    });
  }

  const handleBackToViewer = () => {
    window.location.hash = '/viewer';
  };

  const getStepConnectorClass = (fromStep: number, toStep: number): string => {
    const currentStep = state.conversionState.currentStep;
    if (currentStep > fromStep) {
      return 'completed';
    }
    return '';
  };

  return BUI.html`
    <div class="landing-page">
      <header class="landing-header">
        <div class="header-content">
          <h1 class="landing-title">BIM IDS Validator</h1>
          <p class="landing-subtitle">Validate your IFC models against IDS specifications</p>
          ${state.conversionState.fragmentFileId ? BUI.html`
            <bim-button
              label="Go to Viewer"
              icon="mdi:view-dashboard"
              @click=${handleBackToViewer}
              variant="outlined"
            ></bim-button>
          ` : ''}
        </div>
      </header>

      <main class="landing-content">
        <div class="steps-container">
          <div class="steps-progress">
            <div class="progress-line">
              <div class="progress-fill" style="height: ${(state.conversionState.currentStep - 1) * 25}%"></div>
            </div>
          </div>

          <div class="steps-list">
            <!-- Step 1: IFC Upload -->
            <div class="step-wrapper">
              ${ifcUploadWrapper(state.conversionState)}
              <div class="step-connector ${getStepConnectorClass(1, 2)}"></div>
            </div>

            <!-- Step 2: Fragment Conversion -->
            <div class="step-wrapper">
              ${fragmentConversionWrapper(state.conversionState)}
              <div class="step-connector ${getStepConnectorClass(2, 3)}"></div>
            </div>

            <!-- Step 3: IDS Upload -->
            <div class="step-wrapper">
              ${idsUploadWrapper(state.conversionState)}
              <div class="step-connector ${getStepConnectorClass(3, 4)}"></div>
            </div>

            <!-- Step 4: View Results -->
            <div class="step-wrapper">
              ${viewResultsWrapper(state.conversionState)}
            </div>
          </div>
        </div>

        ${conversionStateManager.getHistory().length > 0 ? BUI.html`
          <aside class="conversion-history">
            <h3 class="history-heading">Conversion History</h3>
            <div class="history-items">
              ${conversionStateManager.getHistory().map(item => BUI.html`
                <div class="history-card">
                  <div class="history-card-icon">📄</div>
                  <div class="history-card-details">
                    <p class="history-card-name">${item.ifcFileName}</p>
                    <p class="history-card-time">${new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <div class="history-card-status ${item.status}">
                    ${item.status === 'complete' ? '✅' :
                      item.status === 'error' ? '❌' : '⏳'}
                  </div>
                </div>
              `)}
            </div>
          </aside>
        ` : ''}
      </main>

      <footer class="landing-footer">
        <p>Powered by Open Source</p>
      </footer>
    </div>
  `;
};

export const createLandingPage = () => {
  const [landingPage, updateLandingPage] = BUI.Component.create<
    HTMLElement,
    LandingPageState
  >(landingPageTemplate, {
    conversionState: conversionStateManager.getState()
  });

  // Subscribe to state changes
  const unsubscribe = conversionStateManager.subscribe((newState) => {
    updateLandingPage({ conversionState: newState });
  });

  return { landingPage, updateLandingPage, unsubscribe };
};