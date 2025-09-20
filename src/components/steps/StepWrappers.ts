import * as BUI from "@thatopen/ui";
import { ConversionState } from "../../services/ConversionStateManager";
import { ifcUploadStepTemplate } from "./IFCUploadStep";
import { fragmentConversionStepTemplate } from "./FragmentConversionStep";
import { idsUploadStepTemplate } from "./IDSUploadStep";
import { viewResultsStepTemplate } from "./ViewResultsStep";

// Wrapper for IFC Upload Step
export const ifcUploadWrapper = (conversionState: ConversionState) => {
  const [element, update] = BUI.Component.create(
    ifcUploadStepTemplate,
    {
      state: conversionState,
      isDragging: false
    }
  );
  return element;
};

// Wrapper for Fragment Conversion Step
export const fragmentConversionWrapper = (conversionState: ConversionState) => {
  const [element, update] = BUI.Component.create(
    fragmentConversionStepTemplate,
    {
      state: conversionState,
      showLogs: false
    }
  );
  return element;
};

// Wrapper for IDS Upload Step
export const idsUploadWrapper = (conversionState: ConversionState) => {
  const [element, update] = BUI.Component.create(
    idsUploadStepTemplate,
    {
      state: conversionState,
      isDragging: false
    }
  );
  return element;
};

// Wrapper for View Results Step
export const viewResultsWrapper = (conversionState: ConversionState) => {
  const [element, update] = BUI.Component.create(
    viewResultsStepTemplate,
    {
      state: conversionState
    }
  );
  return element;
};