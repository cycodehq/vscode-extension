import * as path from 'path';
import {ScanType} from '../../../constants';
import {AnyDetection, IacDetection, SastDetection, ScaDetection, SecretDetection} from '../../../types/detection';
import {Converter} from 'showdown';

const _MARKDOWN_CONVERTER = new Converter();
// BE not always return markdown/html links, so we need to parse it by ourselves
_MARKDOWN_CONVERTER.setOption('simplifiedAutoLink', true);
_MARKDOWN_CONVERTER.setOption('openLinksInNewWindow', true); // make sure that it will open with noreferrer, etc.
_MARKDOWN_CONVERTER.setOption('headerLevelStart', 2); // disable h1 to not make UI ugly


export const enrichDetectionForRender = (detectionType: ScanType, detection: AnyDetection): AnyDetection => {
  switch (detectionType) {
    case ScanType.Sca:
      return _enrichScaDetectionForRender(detection as ScaDetection);
    case ScanType.Secrets:
      return _enrichSecretDetectionForRender(detection as SecretDetection);
    case ScanType.Iac:
      return _enrichIacDetectionForRender(detection as IacDetection);
    case ScanType.Sast:
      return _enrichSastDetectionForRender(detection as SastDetection);
    default:
      return detection;
  }
};

const _updateFieldWithHtmlIfValid = (object: Record<string, any>, field: string) => {
  // a little bit hacky because of any type

  if (!object || !object[field]) {
    return;
  }

  if (typeof object[field] !== 'string') {
    return;
  }

  object[field] = _MARKDOWN_CONVERTER.makeHtml(object[field]);
};

const _enrichScaDetectionForRender = (detection: ScaDetection): ScaDetection => {
  detection.detection_details.description =
      detection.detection_details.alert?.description || detection.detection_details.description;
  _updateFieldWithHtmlIfValid(detection.detection_details, 'description');

  if (!detection.detection_details.alert) {
    return detection;
  }

  _updateFieldWithHtmlIfValid(detection.detection_details, 'custom_remediation_guidelines');
  _updateFieldWithHtmlIfValid(detection.detection_details, 'remediation_guidelines');

  if (!detection.detection_details.alert.first_patched_version) {
    detection.detection_details.alert.first_patched_version = 'Not fixed';
  }

  return detection;
};

const _enrichSecretDetectionForRender = (detection: SecretDetection): SecretDetection => {
  detection.message = detection.message.replace(
      'within \'\' repository', // BE bug
      ''
  );

  detection.detection_details.description = detection.detection_details.description || detection.message;
  _updateFieldWithHtmlIfValid(detection.detection_details, 'description');

  _updateFieldWithHtmlIfValid(detection.detection_details, 'custom_remediation_guidelines');
  _updateFieldWithHtmlIfValid(detection.detection_details, 'remediation_guidelines');

  return detection;
};

const _enrichIacDetectionForRender = (detection: IacDetection): IacDetection => {
  detection.detection_details.file_name = path.basename(detection.detection_details.file_name);

  detection.detection_details.description = detection.detection_details.description || detection.message;
  _updateFieldWithHtmlIfValid(detection.detection_details, 'description');

  _updateFieldWithHtmlIfValid(detection.detection_details, 'custom_remediation_guidelines');
  _updateFieldWithHtmlIfValid(detection.detection_details, 'remediation_guidelines');

  return detection;
};

const _enrichSastDetectionForRender = (detection: SastDetection): SastDetection => {
  _updateFieldWithHtmlIfValid(detection.detection_details, 'description');
  _updateFieldWithHtmlIfValid(detection.detection_details, 'custom_remediation_guidelines');
  _updateFieldWithHtmlIfValid(detection.detection_details, 'remediation_guidelines');

  return detection;
};
