import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import { appIcons, globalIDSIntegration } from "../../globals";

export interface ModelsPanelState {
  components: OBC.Components;
  idsFilesLoaded?: string[];
  isValidating?: boolean;
  validationError?: string;
}

export const modelsPanelTemplate: BUI.StatefullComponent<ModelsPanelState> = (
  state,
  update,
) => {
  const { components } = state;

  // Initialize state if needed
  if (!state.idsFilesLoaded) {
    state.idsFilesLoaded = [];
  }

  const ifcLoader = components.get(OBC.IfcLoader);
  const fragments = components.get(OBC.FragmentsManager);

  const [modelsList] = CUI.tables.modelsList({
    components,
    actions: { download: false },
  });

  const onAddIfcModel = async ({ target }: { target: BUI.Button }) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = ".ifc";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      target.loading = true;
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await ifcLoader.load(bytes, true, file.name.replace(".ifc", ""));
      target.loading = false;
      BUI.ContextMenu.removeMenus();

      // Force component re-render by updating state
      update({ components });
    });

    input.addEventListener("cancel", () => (target.loading = false));

    input.click();
  };

  const onAddFragmentsModel = async ({ target }: { target: BUI.Button }) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = ".frag";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      target.loading = true;
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await fragments.core.load(bytes, {
        modelId: file.name.replace(".frag", ""),
      });
      target.loading = false;
      BUI.ContextMenu.removeMenus();
    });

    input.addEventListener("cancel", () => (target.loading = false));

    input.click();
  };

  const onAddIDSFile = async ({ target }: { target: BUI.Button }) => {
    if (!globalIDSIntegration) {
      console.warn("IDS functionality not available");
      // Show user-friendly message
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="warning" title="IDS Not Available">
            IDS validation functionality is not available in this session.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = ".ids";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;

      target.loading = true;

      try {
        await globalIDSIntegration!.loadIDSFile(file);

        // Update state to track loaded IDS files
        if (!state.idsFilesLoaded) {
          state.idsFilesLoaded = [];
        }
        state.idsFilesLoaded.push(file.name);

        // Force component re-render using update function
        update({ idsFilesLoaded: [...state.idsFilesLoaded] });



        // Show success notification
        const notification = BUI.Component.create(() => {
          return BUI.html`
            <bim-notification type="success" title="IDS File Loaded">
              Successfully loaded IDS file: ${file.name}
            </bim-notification>
          `;
        });
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 3000);

        console.log(`IDS file "${file.name}" loaded successfully`);
      } catch (error) {
        console.error("Failed to load IDS file:", error);

        // Show error notification
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        const notification = BUI.Component.create(() => {
          return BUI.html`
            <bim-notification type="error" title="IDS Loading Failed">
              ${errorMessage}
            </bim-notification>
          `;
        });
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 5000);
      } finally {
        target.loading = false;
        BUI.ContextMenu.removeMenus();
      }
    });

    input.addEventListener("cancel", () => (target.loading = false));

    input.click();
  };

  const onSearch = (e: Event) => {
    const input = e.target as BUI.TextInput;
    modelsList.queryString = input.value;
  };

  const onRunValidation = async () => {
    if (!globalIDSIntegration) {
      console.warn("IDS functionality not available");
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="warning" title="IDS Not Available">
            IDS validation functionality is not available in this session.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
      return;
    }

    // Check if both IFC models and IDS files are loaded
    const hasModels = fragments.list.size > 0;
    const hasIDSFiles = state.idsFilesLoaded && state.idsFilesLoaded.length > 0;

    if (!hasModels) {
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="error" title="No Models Loaded">
            Please load at least one IFC model before running validation.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 4000);
      return;
    }

    if (!hasIDSFiles) {
      const notification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="error" title="No IDS Files Loaded">
            Please load at least one IDS specification file before running validation.
          </bim-notification>
        `;
      });
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 4000);
      return;
    }

    // Set loading state
    state.isValidating = true;
    state.validationError = undefined;
    update({ isValidating: true, validationError: undefined });

    try {
      // Show progress notification
      const progressNotification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="info" title="Running Validation">
            Validating ${fragments.list.size} model(s) against ${state.idsFilesLoaded!.length} IDS specification(s)...
          </bim-notification>
        `;
      });
      document.body.appendChild(progressNotification);

      // Run validation
      await globalIDSIntegration.runValidation();

      // Remove progress notification
      document.body.removeChild(progressNotification);

      // Get results and show success notification
      const results = globalIDSIntegration.getValidationResults();
      const totalSpecs = results.length;
      const totalRequirements = results.reduce((sum, spec) => sum + spec.summary.totalRequirements, 0);
      const failedRequirements = results.reduce((sum, spec) => sum + spec.summary.failedRequirements, 0);

      const successNotification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="success" title="Validation Complete">
            Validated ${totalRequirements} requirements across ${totalSpecs} specification(s). 
            ${failedRequirements > 0 ? `${failedRequirements} requirement(s) failed.` : 'All requirements passed!'}
          </bim-notification>
        `;
      });
      document.body.appendChild(successNotification);
      setTimeout(() => document.body.removeChild(successNotification), 5000);

      console.log("Validation completed successfully:", results);

    } catch (error) {
      console.error("Validation failed:", error);

      // Store error for display
      state.validationError = error instanceof Error ? error.message : "Unknown validation error occurred";
      update({ validationError: state.validationError });

      // Show error notification
      const errorNotification = BUI.Component.create(() => {
        return BUI.html`
          <bim-notification type="error" title="Validation Failed">
            ${state.validationError}
          </bim-notification>
        `;
      });
      document.body.appendChild(errorNotification);
      setTimeout(() => document.body.removeChild(errorNotification), 6000);

    } finally {
      // Clear loading state
      state.isValidating = false;
      update({ isValidating: false });
    }
  };





  // Create IDS files display section
  const idsFilesSection = state.idsFilesLoaded && state.idsFilesLoaded.length > 0
    ? BUI.html`
        <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bim-ui_bg-contrast-20); border-radius: 0.25rem;">
          <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: var(--bim-ui_bg-contrast-100);">
            IDS Files (${state.idsFilesLoaded.length})
          </div>
          ${state.idsFilesLoaded.map(fileName => BUI.html`
            <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80); padding: 0.125rem 0;">
              📋 ${fileName}
            </div>
          `)}
        </div>
      `
    : BUI.html``;

  // Create a reactive validation section that updates periodically
  const createValidationSection = () => {
    const currentHasModels = fragments.list.size > 0;
    const currentHasIDSFiles = state.idsFilesLoaded && state.idsFilesLoaded.length > 0;
    const currentCanRunValidation = currentHasModels && currentHasIDSFiles && globalIDSIntegration && !state.isValidating;

    return BUI.html`
      <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bim-ui_bg-contrast-20); border-radius: 0.25rem; border: 1px solid var(--bim-ui_bg-contrast-40);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <div style="font-size: 0.875rem; font-weight: 500; color: var(--bim-ui_bg-contrast-100);">
            IDS Validation
          </div>
          <bim-button 
            size="xs" 
            label="Run Validation" 
            icon="mdi:play"
            @click=${onRunValidation}
            ?loading=${state.isValidating}
            ?disabled=${!currentCanRunValidation}
          ></bim-button>
        </div>
        
        ${state.isValidating ? BUI.html`
          <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80); display: flex; align-items: center; gap: 0.25rem;">
            <div style="width: 12px; height: 12px; border: 2px solid var(--bim-ui_bg-contrast-80); border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            Validating models...
          </div>
        ` : BUI.html``}
        
        ${!currentCanRunValidation && !state.isValidating ? BUI.html`
          <div style="font-size: 0.75rem; color: var(--bim-ui_bg-contrast-80);">
            ${!currentHasModels ? '⚠️ Load IFC models to enable validation' : ''}
            ${!currentHasIDSFiles ? '⚠️ Load IDS files to enable validation' : ''}
            ${!globalIDSIntegration ? '⚠️ IDS functionality not available' : ''}
          </div>
        ` : BUI.html``}
        
        ${state.validationError ? BUI.html`
          <div style="font-size: 0.75rem; color: #ff6b6b; margin-top: 0.25rem; padding: 0.25rem; background: rgba(255, 107, 107, 0.1); border-radius: 0.125rem;">
            ❌ ${state.validationError}
          </div>
        ` : BUI.html``}
      </div>
    `;
  };

  const validationSection = createValidationSection();

  return BUI.html`
    <bim-panel-section fixed icon=${appIcons.MODEL} label="Models">
      <div style="display: flex; gap: 0.5rem;">
        <bim-text-input @input=${onSearch} vertical placeholder="Search..." debounce="200"></bim-text-input>
        <bim-button style="flex: 0;" icon=${appIcons.ADD}>
          <bim-context-menu style="gap: 0.25rem;">
            <bim-button label="IFC" @click=${onAddIfcModel}></bim-button>
            <bim-button label="Fragments" @click=${onAddFragmentsModel}></bim-button>
            <bim-button label="IDS" @click=${onAddIDSFile}></bim-button>
          </bim-context-menu> 
        </bim-button>
      </div>
      ${modelsList}
      ${idsFilesSection}
      ${validationSection}
    </bim-panel-section> 
  `;
};
