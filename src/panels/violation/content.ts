import style from './style';
import scaCard from './card/sca';
import secretCard from './card/secret';
import js from './js';
import {ScanType} from '../../constants';

export default (detectionType: ScanType) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cycode: Detection Details</title>
</head>
<body>
    ${style}

    ${detectionType == ScanType.Sca ? scaCard : ''}
    ${detectionType == ScanType.Secrets ? secretCard : ''}

    ${js(detectionType)}
</body>
</html>
`;
