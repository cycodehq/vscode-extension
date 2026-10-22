import * as assert from 'assert';
import { CliScanType } from '../../cli/models/cli-scan-type';
import { resolveScanMode, ScanMode } from '../../utils/scan-mode';

suite('resolveScanMode', () => {
  const diffModes = [ScanMode.CommitRange, ScanMode.LocalDiff];
  const diffCapableScanTypes = [CliScanType.Secret, CliScanType.Sca, CliScanType.Sast];

  test('keeps every requested mode for scanners that support it', () => {
    for (const scanType of diffCapableScanTypes) {
      for (const mode of [ScanMode.Project, ...diffModes]) {
        assert.strictEqual(resolveScanMode(scanType, mode), mode, `${scanType} / ${mode}`);
      }
    }
  });

  test('falls back to a project scan for IaC in both diff modes', () => {
    for (const mode of diffModes) {
      assert.strictEqual(resolveScanMode(CliScanType.Iac, mode), ScanMode.Project);
    }
  });

  test('IaC project scans stay project scans', () => {
    assert.strictEqual(resolveScanMode(CliScanType.Iac, ScanMode.Project), ScanMode.Project);
  });
});
