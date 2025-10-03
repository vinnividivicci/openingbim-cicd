import * as OBC from '@thatopen/components';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
// Polyfill fetch and document
global.fetch = fetch;
const dom = new JSDOM();
global.document = dom.window.document;
async function runHeadlessPoc() {
    console.log('Running Headless Proof-of-Concept...');
    const components = new OBC.Components();
    try {
        // Setup a minimal world
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        world.scene = new OBC.SimpleScene(components);
        world.renderer = new OBC.SimpleRenderer(components, document.createElement('canvas'));
        await components.init();
        console.log('Components initialized.');
        // Setup IFC Loader
        const ifcLoader = components.get(OBC.IfcLoader);
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const wasmPath = path.join(__dirname, '../../../node_modules/web-ifc/web-ifc.wasm');
        ifcLoader.settings.wasm = {
            path: wasmPath,
            absolute: true,
        };
        console.log('IFC Loader setup complete.');
        // TODO: Add IFC loading and processing logic here
    }
    catch (error) {
        console.error('An error occurred during the headless POC:', error);
    }
    finally {
        components.dispose();
    }
}
runHeadlessPoc();
