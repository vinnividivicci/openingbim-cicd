import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "..";
import {
  CONTENT_GRID_GAP,
  CONTENT_GRID_ID,
  SMALL_COLUMN_WIDTH,
} from "../../globals";

type Viewer = "viewer";

type Models = {
  name: "models";
  state: TEMPLATES.ModelsPanelState;
};

type ElementData = {
  name: "elementData";
  state: TEMPLATES.ElementsDataPanelState;
};

type Viewpoints = { name: "viewpoints"; state: TEMPLATES.ViewpointsPanelState };

type ValidationResults = {
  name: "validationResults";
  state: TEMPLATES.ValidationResultsPanelState;
};

export type ContentGridElements = [
  Viewer,
  Models,
  ElementData,
  Viewpoints,
  ValidationResults,
];

export type ContentGridLayouts = ["Viewer", "Landing"];

export interface ContentGridState {
  components: OBC.Components;
  id: string;
  viewportTemplate: BUI.StatelessComponent;
}

export const contentGridTemplate: BUI.StatefullComponent<ContentGridState> = (
  state,
) => {
  const { components, id, viewportTemplate } = state;

  return BUI.html`
    <bim-grid 
      id=${id}
      style="padding: ${CONTENT_GRID_GAP}; gap: ${CONTENT_GRID_GAP}"
      .layouts=${{
        Viewer: {
          template: `
            "models viewer elementData" 1fr
            "viewpoints viewer validationResults" 1fr
            /${SMALL_COLUMN_WIDTH} 1fr ${SMALL_COLUMN_WIDTH}
          `,
          elements: {
            models: {
              template: TEMPLATES.modelsPanelTemplate,
              initialState: { components },
            },
            elementData: {
              template: TEMPLATES.elementsDataPanelTemplate,
              initialState: { components },
            },
            viewpoints: {
              template: TEMPLATES.viewpointsPanelTemplate,
              initialState: { components },
            },
            validationResults: {
              template: TEMPLATES.validationResultsPanelTemplate,
              initialState: {
                stateManager: undefined as any,
                lastUpdateTime: 0,
              },
            },
            viewer: viewportTemplate,
          },
        },
      }}
      layout="Viewer"
    ></bim-grid>
  `;
};
/**
 * Creates a content grid component with state management
 * @param components - The OBC.Components instance
 * @param viewportTemplate - The viewport template to use
 * @returns An object containing the grid component and its update function
 *
 * @example
 * ```typescript
 * const { contentGrid, updateContentGrid } = createContentGrid(components, viewport);
 *
 * // Later, update the viewport
 * updateContentGrid({ viewportTemplate: newViewport });
 *
 * // Or update multiple properties
 * updateContentGrid({
 *   id: "new-grid-id",
 *   viewportTemplate: newViewport
 * });
 * ```
 */
export const createContentGrid = (
  components: OBC.Components,
  viewportTemplate: BUI.StatelessComponent,
) => {
  const [contentGrid, updateContentGrid] = BUI.Component.create<
    BUI.Grid<ContentGridLayouts, ContentGridElements>,
    ContentGridState
  >(contentGridTemplate, {
    components,
    id: CONTENT_GRID_ID,
    viewportTemplate,
  });

  return { contentGrid, updateContentGrid };
};

export const getContentGrid = () => {
  const contentGrid = document.getElementById(CONTENT_GRID_ID) as BUI.Grid<
    ContentGridLayouts,
    ContentGridElements
  > | null;

  return contentGrid;
};
