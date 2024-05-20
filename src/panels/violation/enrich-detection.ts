import * as path from 'path';
import {ScanType} from '../../constants';
import {AnyDetection, IacDetection, SastDetection, ScaDetection, SecretDetection} from '../../types/detection';
import {Converter} from 'showdown';

const _MARKDOWN_CONVERTER = new Converter();
// BE not always return markdown/html links, so we need to parse it by ourselves
_MARKDOWN_CONVERTER.setOption('simplifiedAutoLink', true);
_MARKDOWN_CONVERTER.setOption('openLinksInNewWindow', true); // make sure that it will open with noreferrer etc.
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

const _enrichScaDetectionForRender = (detection: ScaDetection): ScaDetection => {
  if (detection.detection_details.alert) {
    detection.detection_details.alert.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.alert.description);

    if (!detection.detection_details.alert.first_patched_version) {
      detection.detection_details.alert.first_patched_version = 'Not fixed';
    }
  }

  return detection;
};

const _enrichSecretDetectionForRender = (detection: SecretDetection): SecretDetection => {
  detection.message = detection.message.replace(
      'within \'\' repository', // BE bug
      ''
  );

  detection.detection_details.description = detection.detection_details.description || detection.message;
  if (detection.detection_details.description) {
    // wrap with P tag to make it consistent with other HTML sections
    detection.detection_details.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.description);
  }

  if (detection.detection_details.custom_remediation_guidelines) {
    detection.detection_details.custom_remediation_guidelines =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.custom_remediation_guidelines);
  }

  return detection;
};

const _enrichIacDetectionForRender = (detection: IacDetection): IacDetection => {
  detection.detection_details.file_name = path.basename(detection.detection_details.file_name);

  if (detection.detection_details.remediation_guidelines) {
    detection.detection_details.remediation_guidelines =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.remediation_guidelines);
  }

  if (detection.detection_details.custom_remediation_guidelines) {
    detection.detection_details.custom_remediation_guidelines =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.custom_remediation_guidelines);
  }

  detection.detection_details.description = detection.detection_details.description || detection.message;
  if (detection.detection_details.description) {
    // wrap with P tag to make it consistent with other HTML sections
    detection.detection_details.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.description);
  }

  return detection;
};

const _enrichSastDetectionForRender = (detection: SastDetection): SastDetection => {
  if (detection.detection_details.description) {
    detection.detection_details.description =
        _MARKDOWN_CONVERTER.makeHtml(detection.detection_details.description);
  }

  return detection;
};
