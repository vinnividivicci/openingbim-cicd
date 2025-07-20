import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import { appIcons, globalIDSIntegration } from "../../globals";

export interface ModelsPanelState {
  components: OBC.Components;
  idsFilesLoaded?: string[];
}

export const modelsPanelTemplate: BUI.StatefullComponent<ModelsPanelState> = (
  state,
) => {
  const { components } = state;

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

  // Create IDS files display section
  const idsFilesSection = state.idsFilesLoaded && state.idsFilesLoaded.length > 0
    ? BUI.html`
        <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bui-color-ifcjs-100); border-radius: 0.25rem;">
          <div style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: var(--bui-color-ifcjs-200);">
            IDS Files (${state.idsFilesLoaded.length})
          </div>
          ${state.idsFilesLoaded.map(fileName => BUI.html`
            <div style="font-size: 0.75rem; color: var(--bui-color-ifcjs-300); padding: 0.125rem 0;">
              📋 ${fileName}
            </div>
          `)}
        </div>
      `
    : BUI.html``;

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
    </bim-panel-section> 
  `;
};
