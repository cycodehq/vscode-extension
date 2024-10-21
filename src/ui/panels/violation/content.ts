import style from './style';
import scaCard from './card/sca';
import secretCard from './card/secret';
import iacCard from './card/iac';
import sastCard from './card/sast';
import js from './js';
import { CliScanType } from '../../../cli/models/cli-scan-type';

export default (detectionType: CliScanType) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cycode: Detection Details</title>
</head>
<body>
    ${style}

    ${detectionType == CliScanType.Sca ? scaCard : ''}
    ${detectionType == CliScanType.Secret ? secretCard : ''}
    ${detectionType == CliScanType.Iac ? iacCard : ''}
    ${detectionType == CliScanType.Sast ? sastCard : ''}

    ${js(detectionType)}
</body>
</html>
`;
