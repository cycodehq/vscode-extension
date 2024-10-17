import * as path from 'path';
import { ScanType } from '../../../constants';
import { Converter } from 'showdown';
import { DetectionBase } from '../../../cli/models/scan-result/detection-base';
import { ScaDetection } from '../../../cli/models/scan-result/sca/sca-detection';
import { SecretDetection } from '../../../cli/models/scan-result/secret/secret-detection';
import { IacDetection } from '../../../cli/models/scan-result/iac/iac-detection';
import { SastDetection } from '../../../cli/models/scan-result/sast/sast-detection';
import { instanceToPlain } from 'class-transformer';

const _MARKDOWN_CONVERTER = new Converter();
// BE not always return markdown/html links, so we need to parse it by ourselves
_MARKDOWN_CONVERTER.setOption('simplifiedAutoLink', true);
_MARKDOWN_CONVERTER.setOption('openLinksInNewWindow', true); // make sure that it will open with noreferrer, etc.
_MARKDOWN_CONVERTER.setOption('headerLevelStart', 2); // disable h1 to not make UI ugly

export const getDetectionForRender = (detectionType: ScanType, detection: DetectionBase): object => {
  /*
   * all functions must not mutate the input object!
   * it is fine to use the original object to read values,
   * but all modifications must be done on a new plain (literal) objects!
   * return literal objects to avoid any side effects
   * use the original object as much as possible because it has proper types
   */

  const getDetectionForRenderFunctions: Record<ScanType, (detection: DetectionBase) => object> = {
    [ScanType.Secret]: (detection: DetectionBase) => _getSecretDetectionForRender(detection as SecretDetection),
    [ScanType.Sca]: (detection: DetectionBase) => _getScaDetectionForRender(detection as ScaDetection),
    [ScanType.Iac]: (detection: DetectionBase) => _getIacDetectionForRender(detection as IacDetection),
    [ScanType.Sast]: (detection: DetectionBase) => _getSastDetectionForRender(detection as SastDetection),
  };

  const enrichFunction = getDetectionForRenderFunctions[detectionType];
  return enrichFunction ? enrichFunction(detection) : detection;
};

const _updateFieldWithHtmlIfValid = (object: Record<string, any>, field: string) => {
  // a little bit hacky because of any type

  if (!object[field]) {
    return;
  }

  if (typeof object[field] !== 'string') {
    return;
  }

  object[field] = _MARKDOWN_CONVERTER.makeHtml(object[field]);
};

const _getScaDetectionForRender = (detection: ScaDetection): object => {
  const renderedDetection = instanceToPlain(detection);

  renderedDetection.detectionDetails.description
      = detection.detectionDetails.alert?.description || detection.detectionDetails.description;
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'description');

  if (!detection.detectionDetails.alert) {
    return renderedDetection;
  }

  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'customRemediationGuidelines');
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'remediationGuidelines');

  if (!detection.detectionDetails.alert.firstPatchedVersion) {
    renderedDetection.detectionDetails.alert.firstPatchedVersion = 'Not fixed';
  }

  return renderedDetection;
};

const _getSecretDetectionForRender = (detection: SecretDetection): object => {
  const renderedDetection = instanceToPlain(detection);

  renderedDetection.message = detection.getFormattedMessage();

  renderedDetection.detectionDetails.description = detection.detectionDetails.description || detection.message;
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'description');

  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'customRemediationGuidelines');
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'remediationGuidelines');

  return renderedDetection;
};

const _getIacDetectionForRender = (detection: IacDetection): object => {
  const renderedDetection = instanceToPlain(detection);

  renderedDetection.detectionDetails.fileName = path.basename(detection.detectionDetails.fileName);

  renderedDetection.detectionDetails.description = detection.detectionDetails.description || detection.message;
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'description');

  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'customRemediationGuidelines');
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'remediationGuidelines');

  return renderedDetection;
};

const _getSastDetectionForRender = (detection: SastDetection): object => {
  const renderedDetection = instanceToPlain(detection);

  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'description');
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'customRemediationGuidelines');
  _updateFieldWithHtmlIfValid(renderedDetection.detectionDetails, 'remediationGuidelines');

  return renderedDetection;
};
