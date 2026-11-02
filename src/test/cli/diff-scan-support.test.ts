import * as assert from 'assert';
import { supportsDiffScan } from '../../cli/constants';
import { CliScanType } from '../../cli/models/cli-scan-type';

suite('supportsDiffScan', () => {
  test('is supported for every scanner except IaC', () => {
    assert.strictEqual(supportsDiffScan(CliScanType.Secret), true);
    assert.strictEqual(supportsDiffScan(CliScanType.Sca), true);
    assert.strictEqual(supportsDiffScan(CliScanType.Sast), true);
    assert.strictEqual(supportsDiffScan(CliScanType.Iac), false);
  });
});
