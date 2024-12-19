export class ScaDetectionDetailsAlert {
  severity: string;
  summary: string;
  description: string;
  vulnerableRequirements?: string;
  firstPatchedVersion?: string;
  cveIdentifier?: string;
}
