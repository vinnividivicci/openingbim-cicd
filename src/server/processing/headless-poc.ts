import { IfcAPI } from 'web-ifc';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

async function runHeadlessPoc() {
  console.log('Running Headless Proof-of-Concept with web-ifc...');

  const ifcApi = new IfcAPI();

  try {
    // Set the path to the web-ifc.wasm file
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const wasmPath = path.join(__dirname, '../../../node_modules/web-ifc/web-ifc.wasm');
    await ifcApi.Init();

    console.log('web-ifc initialized.');

    // Load an IFC file (replace with a real IFC file path)
    const ifcFilePath = path.join(__dirname, '../../../../bonsai/test-model-4-walls.ifc');
    const ifcFile = fs.readFileSync(ifcFilePath);
    const modelID = ifcApi.OpenModel(ifcFile);

    console.log(`IFC model loaded. Model ID: ${modelID}`);

    // TODO: Add fragment generation and IDS validation logic here

    ifcApi.CloseModel(modelID);

  } catch (error) {
    console.error('An error occurred during the headless POC:', error);
  } finally {
    ifcApi.Close();
  }
}

runHeadlessPoc();