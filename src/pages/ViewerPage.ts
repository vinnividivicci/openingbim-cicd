import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "../ui-templates";
import { appIcons, CONTENT_GRID_ID, setGlobalIDSIntegration, globalIDSIntegration } from "../globals";
import { viewportSettingsTemplate } from "../ui-templates/buttons/viewport-settings";
import { IDSIntegration, ValidationDisplayResult, RequirementDisplayResult, FailedElementInfo } from "../bim-components";
import { conversionStateManager } from "../services/ConversionStateManager";
import { getGlobalUIStateManager } from "../ui-templates/sections/validation-results";

let viewerInitialized = false;
let components: OBC.Components;
let world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>;
let viewport: BUI.Viewport;
let contentGrid: BUI.Grid<TEMPLATES.ContentGridLayouts, TEMPLATES.ContentGridElements>;
let app: BUI.Grid<["App"], [{ name: "sidebar"; state: TEMPLATES.GridSidebarState }, { name: "contentGrid"; state: TEMPLATES.ContentGridState }]>;

export async function initializeViewer() {
  if (viewerInitialized) {
    return { components, world, viewport, contentGrid, app };
  }

  console.log("Initializing BIM Viewer...");

  // Components Setup
  components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);

  world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBF.PostproductionRenderer
  >();

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = new THREE.Color(0x1a1d23);

  viewport = BUI.Component.create<BUI.Viewport>(() => {
    return BUI.html`<bim-viewport></bim-viewport>`;
  });

  world.renderer = new OBF.PostproductionRenderer(components, viewport);
  world.camera = new OBC.OrthoPerspectiveCamera(components);
  const perspCamera = world.camera as OBC.OrthoPerspectiveCamera;
  perspCamera.threePersp.near = 0.01;
  perspCamera.threePersp.updateProjectionMatrix();
  if (perspCamera.controls) {
    perspCamera.controls.restThreshold = 0.05;
  }

  const worldGrid = components.get(OBC.Grids).create(world);
  worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);
  worldGrid.material.uniforms.uSize1.value = 2;
  worldGrid.material.uniforms.uSize2.value = 8;

  const resizeWorld = () => {
    world.renderer?.resize();
    const perspCamera = world.camera as OBC.OrthoPerspectiveCamera;
    perspCamera.updateAspect();
  };

  viewport.addEventListener("resize", resizeWorld);

  // Set dynamic anchor if available
  if ('dynamicAnchor' in world) {
    (world as any).dynamicAnchor = false;
  }

  components.init();

  components.get(OBC.Raycasters).get(world);

  const renderer = world.renderer as OBF.PostproductionRenderer;
  const { postproduction } = renderer;
  postproduction.enabled = true;
  postproduction.style = OBF.PostproductionAspect.COLOR_SHADOWS;

  const { aoPass, edgesPass } = renderer.postproduction;

  edgesPass.color = new THREE.Color(0x494b50);

  const aoParameters = {
    radius: 0.25,
    distanceExponent: 1,
    thickness: 1,
    scale: 1,
    samples: 16,
    distanceFallOff: 1,
    screenSpaceRadius: true,
  };

  const pdParameters = {
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3,
    radius: 4,
    radiusExponent: 1,
    rings: 2,
    samples: 16,
  };

  aoPass.updateGtaoMaterial(aoParameters);
  aoPass.updatePdMaterial(pdParameters);

  const fragments = components.get(OBC.FragmentsManager);

  // Initialize FragmentsManager with worker from CDN (recommended approach)
  const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
  const fetchedUrl = await fetch(githubUrl);
  const workerBlob = await fetchedUrl.blob();
  const workerFile = new File([workerBlob], "worker.mjs", {
    type: "text/javascript",
  });
  const workerUrl = URL.createObjectURL(workerFile);
  fragments.init(workerUrl);

  fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
    const isLod = "isLodMaterial" in material && material.isLodMaterial;
    if (isLod) {
      const renderer = world.renderer as OBF.PostproductionRenderer;
      renderer.postproduction.basePass.isolatedMaterials.push(material);
    }
  });

  const orthoCamera = world.camera as OBC.OrthoPerspectiveCamera;
  orthoCamera.projection.onChanged.add(() => {
    for (const [_, model] of fragments.list) {
      model.useCamera(orthoCamera.three);
    }
    fragments.core.update(true);
  });

  // Update fragments during camera movement for better LOD and culling
  if (orthoCamera.controls) {
    orthoCamera.controls.addEventListener("update", () => {
      fragments.core.update(true);
    });

    orthoCamera.controls.addEventListener("rest", () => {
      fragments.core.update(true);
    });
  }

  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.69/" },
  });

  const highlighter = components.get(OBF.Highlighter);
  highlighter.setup({
    world,
    selectMaterialDefinition: {
      color: new THREE.Color("#bcf124"),
      renderedFaces: 1,
      opacity: 1,
      transparent: false,
    },
  });

  // IDS Integration Setup
  let idsIntegration: IDSIntegration | undefined;
  try {
    idsIntegration = new IDSIntegration(components);
    await idsIntegration.setup(highlighter);
    setGlobalIDSIntegration(idsIntegration);
    console.log("IDS validation functionality initialized successfully");
  } catch (error) {
    console.warn("IDS validation functionality not available:", error);
    setGlobalIDSIntegration(undefined);
    // Continue without IDS functionality - the app should still work for basic IFC viewing
  }

  // Clipper Setup
  const clipper = components.get(OBC.Clipper);
  viewport.ondblclick = () => {
    if (clipper.enabled) clipper.create(world);
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "Delete" || event.code === "Backspace") {
      clipper.delete(world);
    }
  });

  // Length Measurement Setup
  const lengthMeasurer = components.get(OBF.LengthMeasurement);
  lengthMeasurer.world = world;
  lengthMeasurer.color = new THREE.Color("#6528d7");

  lengthMeasurer.list.onItemAdded.add((line) => {
    const center = new THREE.Vector3();
    line.getCenter(center);
    const radius = line.distance() / 3;
    const sphere = new THREE.Sphere(center, radius);
    const perspCamera = world.camera as OBC.OrthoPerspectiveCamera;
    if (perspCamera.controls) {
      perspCamera.controls.fitToSphere(sphere, true);
    }
  });

  viewport.addEventListener("dblclick", () => lengthMeasurer.create());

  window.addEventListener("keydown", (event) => {
    if (event.code === "Delete" || event.code === "Backspace") {
      lengthMeasurer.delete();
    }
  });

  // Area Measurement Setup
  const areaMeasurer = components.get(OBF.AreaMeasurement);
  areaMeasurer.world = world;
  areaMeasurer.color = new THREE.Color("#6528d7");

  areaMeasurer.list.onItemAdded.add((area) => {
    if (!area.boundingBox) return;
    const sphere = new THREE.Sphere();
    area.boundingBox.getBoundingSphere(sphere);
    const perspCamera = world.camera as OBC.OrthoPerspectiveCamera;
    if (perspCamera.controls) {
      perspCamera.controls.fitToSphere(sphere, true);
    }
  });

  viewport.addEventListener("dblclick", () => {
    areaMeasurer.create();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      areaMeasurer.endCreation();
    }
  });

  // Define what happens when a fragments model has been loaded
  fragments.list.onItemSet.add(async ({ value: model }) => {
    const perspCamera = world.camera as OBC.OrthoPerspectiveCamera;
    model.useCamera(perspCamera.three);
    model.getClippingPlanesEvent = () => {
      const renderer = world.renderer as OBF.PostproductionRenderer;
      return Array.from(renderer.three.clippingPlanes) || [];
    };
    world.scene.three.add(model.object);
    await fragments.core.update(true);
  });

  // Viewport Layouts
  const [viewportSettings] = BUI.Component.create(viewportSettingsTemplate, {
    components,
    world,
  });

  viewport.append(viewportSettings);

  const [viewportGrid] = BUI.Component.create(TEMPLATES.viewportGridTemplate, {
    components,
    world,
  });

  viewport.append(viewportGrid);

  // Content Grid Setup
  const viewportCardTemplate = () => BUI.html`
    <div class="dashboard-card" style="padding: 0px;">
      ${viewport}
    </div>
  `;

  const result = TEMPLATES.createContentGrid(
    components,
    viewportCardTemplate,
  );

  contentGrid = result.contentGrid;
  const updateContentGrid = result.updateContentGrid;

  const contentGridIcons: Record<TEMPLATES.ContentGridLayouts[number], string> = {
    Viewer: appIcons.MODEL,
    Landing: appIcons.MODEL,
  };

  // App Grid Setup
  type AppLayouts = ["App"];

  type Sidebar = {
    name: "sidebar";
    state: TEMPLATES.GridSidebarState;
  };

  type ContentGrid = { name: "contentGrid"; state: TEMPLATES.ContentGridState };

  type AppGridElements = [Sidebar, ContentGrid];

  app = document.getElementById("app") as BUI.Grid<
    AppLayouts,
    AppGridElements
  >;

  app.elements = {
    sidebar: {
      template: TEMPLATES.gridSidebarTemplate,
      initialState: {
        grid: contentGrid,
        compact: true,
        layoutIcons: contentGridIcons,
      },
    },
    contentGrid,
  };

  contentGrid.addEventListener("layoutchange", () =>
    app.updateComponent.sidebar(),
  );

  app.layouts = {
    App: {
      template: `
        "sidebar contentGrid" 1fr
        /auto 1fr
      `,
    },
  };

  app.layout = "App";

  // Set viewer layout
  contentGrid.layout = "Viewer";

  viewerInitialized = true;
  console.log("BIM Viewer initialized successfully");

  return { components, world, viewport, contentGrid, app };
}

export async function loadFragmentFromAPI(fileId: string) {
  if (!viewerInitialized) {
    await initializeViewer();
  }

  console.log(`Loading fragment file: ${fileId}`);

  try {
    // Use relative URL for API
    const apiBaseUrl = '/api/v1';

    // Fetch fragment file from backend
    const response = await fetch(`${apiBaseUrl}/fragments/${fileId}`);

    if (!response.ok) {
      throw new Error('Failed to load fragment file');
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const fragments = components.get(OBC.FragmentsManager);
    await fragments.core.load(bytes, {
      modelId: fileId,
    });

    console.log(`Fragment file ${fileId} loaded successfully`);

    // Fit camera to model
    // Note: getBbox might not be available in current version
    // Alternative approach: fit to all loaded models
    const perspCamera = world.camera as OBC.OrthoPerspectiveCamera;
    if (perspCamera.controls) {
      // Try to fit to the loaded model
      try {
        const allModels = Array.from(fragments.list.values());
        if (allModels.length > 0) {
          const lastModel = allModels[allModels.length - 1];
          const bbox = new THREE.Box3().setFromObject(lastModel.object);
          const sphere = new THREE.Sphere();
          bbox.getBoundingSphere(sphere);
          perspCamera.controls.fitToSphere(sphere, true);
        }
      } catch (error) {
        console.warn('Could not fit camera to model:', error);
      }
    }

  } catch (error) {
    console.error('Failed to load fragment:', error);
    conversionStateManager.showNotification(
      'error',
      'Failed to Load Model',
      'Could not load the fragment file from the server'
    );
  }
}

export async function loadValidationResults(resultsId: string) {
  if (!viewerInitialized) {
    await initializeViewer();
  }

  console.log(`Loading validation results: ${resultsId}`);

  try {
    // Use relative URL for API
    const apiBaseUrl = '/api/v1';

    // Get the file name from conversion state
    const state = conversionStateManager.getState();
    const fileName = state.ifcFile?.name || 'Unknown Model';

    // Fetch validation results from backend
    const response = await fetch(`${apiBaseUrl}/ids/results/${resultsId}`);

    if (!response.ok) {
      throw new Error('Failed to load validation results');
    }

    const responseData = await response.json();
    console.log('Raw response from backend:', responseData);

    // Extract the actual validation results from the wrapped response
    const results = responseData.validationResults || responseData;
    console.log('Extracted validation results:', results);

    // Transform backend results to ValidationDisplayResult format
    const transformedResults: ValidationDisplayResult[] = [];

    // Check if results have the expected structure
    if (results.specifications && Array.isArray(results.specifications)) {
      results.specifications.forEach((spec: any) => {
        const requirements: RequirementDisplayResult[] = [];

        // Process each requirement in the specification
        if (spec.requirements && Array.isArray(spec.requirements)) {
          spec.requirements.forEach((req: any) => {
            // Determine requirement status based on failed elements
            const hasFailed = req.failed_elements && req.failed_elements.length > 0;
            const status = hasFailed ? 'failed' : 'passed';

            // Map failed elements
            const failedElements: FailedElementInfo[] = (req.failed_elements || []).map((elem: any) => ({
              elementId: elem.element_id || elem.id || elem,
              elementType: elem.element_type || 'Unknown',
              elementName: elem.element_name,
              reason: elem.failure_reason || elem.reason || 'Requirement not met',
              properties: elem.properties
            }));

            requirements.push({
              id: req.id || req.requirement_id || `req_${requirements.length}`,
              name: req.name || req.description || 'Requirement',
              description: req.description,
              status: status,
              applicabilityCount: req.applicable_count || req.total_elements || 0,
              passedCount: req.passed_count || (req.total_elements - failedElements.length) || 0,
              failedCount: req.failed_count || failedElements.length || 0,
              failedElements: failedElements
            });
          });
        }

        // Calculate specification totals
        const totalRequirements = requirements.length;
        const passedRequirements = requirements.filter(r => r.status === 'passed').length;
        const failedRequirements = requirements.filter(r => r.status === 'failed').length;
        const totalElements = requirements.reduce((sum, r) => sum + (r.applicabilityCount || 0), 0);
        const passedElements = requirements.reduce((sum, r) => sum + r.passedCount, 0);
        const failedElements = requirements.reduce((sum, r) => sum + r.failedCount, 0);

        transformedResults.push({
          specificationId: spec.id || spec.specification_id || `spec_${transformedResults.length}`,
          specificationName: spec.name || spec.title || 'Specification',
          modelName: fileName,
          requirements: requirements,
          summary: {
            totalRequirements: totalRequirements,
            passedRequirements: passedRequirements,
            failedRequirements: failedRequirements
          },
          validationDate: new Date()
        });
      });
    } else if (results.summary) {
      // Handle alternative result format with summary
      console.log('Processing results with summary format');

      // Create a single specification from summary data
      const requirements: RequirementDisplayResult[] = [];

      // If there are individual test results
      if (results.results && Array.isArray(results.results)) {
        results.results.forEach((result: any, index: number) => {
          const hasFailed = result.status === 'failed' || result.passed === false;
          requirements.push({
            id: result.id || `req_${index}`,
            name: result.name || result.description || 'Validation Check',
            description: result.description || result.message,
            status: hasFailed ? 'failed' : 'passed',
            applicabilityCount: 1,
            passedCount: hasFailed ? 0 : 1,
            failedCount: hasFailed ? 1 : 0,
            failedElements: hasFailed ? [{
              elementId: result.element_id || 'unknown',
              elementType: result.element_type || 'Unknown',
              elementName: undefined,
              reason: result.reason || result.message || 'Check failed',
              properties: undefined
            }] : []
          });
        });
      }

      transformedResults.push({
        specificationId: 'validation_results',
        specificationName: 'IDS Validation Results',
        modelName: fileName || 'Unknown Model',
        requirements: requirements,
        summary: {
          totalRequirements: requirements.length,
          passedRequirements: results.summary?.passed || requirements.filter(r => r.status === 'passed').length,
          failedRequirements: results.summary?.failed || requirements.filter(r => r.status === 'failed').length
        },
        validationDate: new Date()
      });
    }

    console.log('Transformed results array:', transformedResults);
    console.log('Number of specifications found:', transformedResults.length);

    // Update the global UI state manager with the results
    const uiStateManager = getGlobalUIStateManager();
    console.log('Updating UI state manager with results...');
    uiStateManager.updateResults(transformedResults);
    console.log('UI state manager updated successfully');

    // If global IDS integration exists, update it for highlighting capabilities
    if (globalIDSIntegration) {
      console.log('Updating globalIDSIntegration with results...');
      // Store results in IDS integration for highlighting
      (globalIDSIntegration as any)._currentResults = transformedResults;

      // Verify the results were set
      const verifyResults = globalIDSIntegration.getValidationResults();
      console.log('Verified globalIDSIntegration now has', verifyResults.length, 'results');

      // Trigger highlighting of failures
      try {
        await (globalIDSIntegration as any).highlightAllFailures();
      } catch (error) {
        console.warn('Could not highlight validation failures:', error);
      }
    } else {
      console.log('globalIDSIntegration not available, skipping highlighting setup');
    }

    conversionStateManager.showNotification(
      'success',
      'Validation Results Loaded',
      `Loaded ${transformedResults.length} specification(s) with validation results`
    );

  } catch (error) {
    console.error('Failed to load validation results:', error);
    conversionStateManager.showNotification(
      'error',
      'Failed to Load Results',
      'Could not load the validation results from the server'
    );
  }
}

export function showViewer() {
  if (!viewerInitialized) {
    return;
  }

  // Make sure the app grid is visible
  if (app) {
    app.style.display = 'grid';
  }
}

export function hideViewer() {
  if (!viewerInitialized) {
    return;
  }

  // Hide the app grid
  if (app) {
    app.style.display = 'none';
  }
}