import * as vscode from "vscode";
import { extensionOutput } from "../logging/extension-output";
import { cliWrapper } from "../cli-wrapper/cli-wrapper";
import statusBar from "../utils/status-bar";
import {
  StatusBarTexts,
  TrayNotificationTexts,
  extensionId,
} from "../utils/texts";
import { validateCliCommonErrors } from "./common";
import { getWorkspaceState, updateWorkspaceState } from "../utils/context";
import { Detection, ScaDetection } from "../types/detection";
import { IConfig } from "../cli-wrapper/types";
import TrayNotifications from "../utils/TrayNotifications";

// Entry
export async function scaScan(
  context: vscode.ExtensionContext,
  params: {
    workspaceFolderPath: string;
    diagnosticCollection: vscode.DiagnosticCollection;
    config: IConfig;
  },
  extFilePath?: string
) {
  if (getWorkspaceState("scan.isScanning")) {
    return;
  }
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
    },
    async (progress) => {
      try {
        extensionOutput.info(StatusBarTexts.ScanWait);
        statusBar.showScanningInProgress();

        extensionOutput.info(
          "Initiating SCA scan for path: " + params.workspaceFolderPath
        );
        updateWorkspaceState("scan.isScanning", true);

        // Run scan through CLI
        let cliParams = {
          path: params.workspaceFolderPath,
          workspaceFolderPath: params.workspaceFolderPath,
          config: params.config,
        };

        progress.report({
          message: `Scanning ${params.workspaceFolderPath}...`,
        });

        updateWorkspaceState("scan.isScanning", false);
        const { result, error, exitCode } = await cliWrapper.runScaScan(
          cliParams
        );

        if (validateCliCommonErrors(error, exitCode)) {
          return;
        }

        // Check if an error occurred
        if (error && !result.detections?.length) {
          throw new Error(error);
        }

        extensionOutput.info(
          "Scan complete: " + JSON.stringify({ result, error }, null, 3)
        );

        // Show in problems tab
        await handleScanDetections(
          staticResults,
          // filePath,
          params.diagnosticCollection
          // document
        );

        statusBar.showScanComplete();
      } catch (error) {
        extensionOutput.error("Error while creating scan: " + error);
        statusBar.showScanError();
        updateWorkspaceState("scan.isScanning", false);

        vscode.window.showErrorMessage(TrayNotificationTexts.ScanError);
      }
    }
  );
}

export const detectionsToDiagnostings = async (
  detections: ScaDetection[]
): Promise<Record<string, vscode.Diagnostic[]>> => {
  const result: Record<string, vscode.Diagnostic[]> = {};

  for (const detection of detections) {
    const { detection_details } = detection;
    const file_name = detection_details.file_name;
    const uri = vscode.Uri.file(file_name);
    const document = await vscode.workspace.openTextDocument(uri);

    let message = `Severity: ${detection.severity}\n`;
    message += `${detection.message}\n`;
    message += `Rule ID: ${detection.detection_rule_id}\n`;

    const diagnostic = new vscode.Diagnostic(
      document.lineAt(detection_details.line_in_file).range,
      message,
      vscode.DiagnosticSeverity.Error
    );

    diagnostic.source = extensionId;
    diagnostic.code = detection.detection_rule_id;
    result[file_name] = result[file_name] || [];
    result[file_name].push(diagnostic);
  }

  return result;
};

const handleScanDetections = async (
  result: any,
  // filePath: string,
  diagnosticCollection: vscode.DiagnosticCollection
  // document: vscode.TextDocument
) => {
  if (result.detections) {
    const diagnostics = await detectionsToDiagnostings(result.detections);

    // iterate over diagnostics
    // add the diagnostics to the diagnostic collection
    for (const [filePath, fileDiagnostics] of Object.entries(diagnostics)) {
      const uri = vscode.Uri.file(filePath);
      diagnosticCollection.set(uri, fileDiagnostics); // Show in problems tab
    }

    if (result.detections.length && !getWorkspaceState("cycode.notifOpen")) {
      updateWorkspaceState("cycode.notifOpen", true);
      TrayNotifications.showProblemsDetection(Object.keys(diagnostics).length);
    }
  }
};

const staticResults = {
  scan_id: "3c60cb54-ab6b-48bf-85de-b0c15da295b9",
  detections: [
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::@grpc/grpc-js::1.7.3",
        alert: {
          affected_package_name: "@grpc/grpc-js",
          package_description: "gRPC Library for Node - pure JS implementation",
          cve_identifier: "CVE-2023-32731",
          ghsa_identifier: "GHSA-cfgp-2977-2fmm",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "1.7.3",
          first_patched_version: "1.8.8",
          severity: "HIGH",
          ecosystem: "NPM",
          description:
            "When gRPC HTTP2 stack raised a header size exceeded error, it skipped parsing the rest of the HPACK frame. This caused any HPACK table mutations to also be skipped, resulting in a desynchronization of HPACK tables between sender and receiver. If leveraged, say, between a proxy and a backend, this could lead to requests from the proxy being interpreted as containing headers from different proxy clients - leading to an information leak that can be used for privilege escalation or data exfiltration. We recommend upgrading beyond the commit contained in  https://github.com/grpc/grpc/pull/32309",
          summary: "Connection confusion in gRPC",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths:
            "firebase 9.14.0 -> @firebase/firestore 3.7.3 -> @grpc/grpc-js 1.7.3",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "HIGH",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2023-32731",
        vulnerability_description: "Connection confusion in gRPC",
        vulnerable_component: "@grpc/grpc-js",
        vulnerable_component_version: "1.7.3",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 7.4,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 44,
            start_position: 43,
            end_position: 43,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 19629,
            start_position: 19628,
            end_position: 19628,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "@grpc/grpc-js",
        package_version: "1.7.3",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "firebase 9.14.0 -> @firebase/firestore 3.7.3 -> @grpc/grpc-js 1.7.3",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 19629,
        start_position: 19628,
        end_position: 19628,
      },
      type: "vulnerable_code_dependency",
      severity: "High",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package '@grpc/grpc-js' referenced in project 'Users/zeari/projects/higene/app': Connection confusion in gRPC",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::semver::7.3.8",
        alert: {
          affected_package_name: "semver",
          package_description: "The semantic version parser used by npm.",
          cve_identifier: "CVE-2022-25883",
          ghsa_identifier: "GHSA-c2qf-rxjj-qqgw",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "7.3.8",
          first_patched_version: "7.5.2",
          severity: "MEDIUM",
          ecosystem: "NPM",
          description:
            "Versions of the package semver before 7.5.2 are vulnerable to Regular Expression Denial of Service (ReDoS) via the function new Range, when untrusted user data is provided as a range.\n\n\n",
          summary: "semver vulnerable to Regular Expression Denial of Service",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths: "react-scripts 5.0.1 -> semver 7.3.8",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "MEDIUM",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2022-25883",
        vulnerability_description:
          "semver vulnerable to Regular Expression Denial of Service",
        vulnerable_component: "semver",
        vulnerable_component_version: "7.3.8",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 5.3,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 28802,
            start_position: 28801,
            end_position: 28801,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "semver",
        package_version: "7.3.8",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths: "react-scripts 5.0.1 -> semver 7.3.8",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 28802,
        start_position: 28801,
        end_position: 28801,
      },
      type: "vulnerable_code_dependency",
      severity: "Medium",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'semver' referenced in project 'Users/zeari/projects/higene/app': semver vulnerable to Regular Expression Denial of Service",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::word-wrap::1.2.3",
        alert: {
          affected_package_name: "word-wrap",
          package_description: "Wrap words to a specified length.",
          cve_identifier: "CVE-2023-26115",
          ghsa_identifier: "GHSA-j8xg-fqg3-53r7",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "1.2.3",
          first_patched_version: null,
          severity: "MEDIUM",
          ecosystem: "NPM",
          description:
            "All versions of the package word-wrap are vulnerable to Regular Expression Denial of Service (ReDoS) due to the usage of an insecure regular expression within the result variable.\n",
          summary:
            "word-wrap vulnerable to Regular Expression Denial of Service",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths:
            "react-scripts 5.0.1 -> eslint 8.27.0 -> optionator 0.9.1 -> word-wrap 1.2.3",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "MEDIUM",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2023-26115",
        vulnerability_description:
          "word-wrap vulnerable to Regular Expression Denial of Service",
        vulnerable_component: "word-wrap",
        vulnerable_component_version: "1.2.3",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 5.3,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 30134,
            start_position: 30133,
            end_position: 30133,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "word-wrap",
        package_version: "1.2.3",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> eslint 8.27.0 -> optionator 0.9.1 -> word-wrap 1.2.3",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 30134,
        start_position: 30133,
        end_position: 30133,
      },
      type: "vulnerable_code_dependency",
      severity: "Medium",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'word-wrap' referenced in project 'Users/zeari/projects/higene/app': word-wrap vulnerable to Regular Expression Denial of Service",
    },
    {
      detection_details: {
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        manifest_file_path: "Users/zeari/projects/higene/app/package.json",
        ecosystem: "NPM",
        package_name: "lz-string",
        package_version: "1.4.4",
        license: "WTFPL",
        source_url: "https://github.com/pieroxy/lz-string",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "@testing-library/react 13.4.0 -> @testing-library/dom 8.19.0 -> lz-string 1.4.4",
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 26643,
        start_position: 26642,
        end_position: 26642,
      },
      type: "Non permissive license",
      severity: "Medium",
      detection_rule_id: "f0dd0af9-9196-40bd-aa43-7230dc711399",
      detection_type_id: "8f681450-49e1-4f7e-85b7-0c8fe84b3a35",
      message: "Package lz-string has non-permissive license.",
    },
    {
      detection_details: {
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        manifest_file_path: "Users/zeari/projects/higene/app/package.json",
        ecosystem: "NPM",
        package_name: "harmony-reflect",
        package_version: "1.6.2",
        license: "Apache-2.0,MPL-1.1",
        source_url: "https://tvcutsem@github.com/tvcutsem/harmony-reflect",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> identity-obj-proxy 3.0.0 -> harmony-reflect 1.6.2",
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 24261,
        start_position: 24260,
        end_position: 24260,
      },
      type: "Non permissive license",
      severity: "Medium",
      detection_rule_id: "f0dd0af9-9196-40bd-aa43-7230dc711399",
      detection_type_id: "8f681450-49e1-4f7e-85b7-0c8fe84b3a35",
      message: "Package harmony-reflect has non-permissive license.",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::json5::1.0.1",
        alert: {
          affected_package_name: "json5",
          package_description: "JSON for humans.",
          cve_identifier: "CVE-2022-46175",
          ghsa_identifier: "GHSA-9c47-m6qq-7p4h",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "1.0.1",
          first_patched_version: "1.0.2",
          severity: "HIGH",
          ecosystem: "NPM",
          description:
            "The `parse` method of the JSON5 library before and including version `2.2.1` does not restrict parsing of keys named `__proto__`, allowing specially crafted strings to pollute the prototype of the resulting object.\n\nThis vulnerability pollutes the prototype of the object returned by `JSON5.parse` and not the global Object prototype, which is the commonly understood definition of Prototype Pollution. However, polluting the prototype of a single object can have significant security impact for an application if the object is later used in trusted operations.\n\n## Impact\nThis vulnerability could allow an attacker to set arbitrary and unexpected keys on the object returned from `JSON5.parse`. The actual impact will depend on how applications utilize the returned object and how they filter unwanted keys, but could include denial of service, cross-site scripting, elevation of privilege, and in extreme cases, remote code execution.\n\n## Mitigation\nThis vulnerability is patched in json5 v2.2.2 and later. A patch has also been backported for json5 v1 in versions v1.0.2 and later.\n\n## Details\n \nSuppose a developer wants to allow users and admins to perform some risky operation, but they want to restrict what non-admins can do. To accomplish this, they accept a JSON blob from the user, parse it using `JSON5.parse`, confirm that the provided data does not set some sensitive keys, and then performs the risky operation using the validated data:\n \n```js\nconst JSON5 = require('json5');\n\nconst doSomethingDangerous = (props) => {\n  if (props.isAdmin) {\n    console.log('Doing dangerous thing as admin.');\n  } else {\n    console.log('Doing dangerous thing as user.');\n  }\n};\n\nconst secCheckKeysSet = (obj, searchKeys) => {\n  let searchKeyFound = false;\n  Object.keys(obj).forEach((key) => {\n    if (searchKeys.indexOf(key) > -1) {\n      searchKeyFound = true;\n    }\n  });\n  return searchKeyFound;\n};\n\nconst props = JSON5.parse('{\"foo\": \"bar\"}');\nif (!secCheckKeysSet(props, ['isAdmin', 'isMod'])) {\n  doSomethingDangerous(props); // \"Doing dangerous thing as user.\"\n} else {\n  throw new Error('Forbidden...');\n}\n```\n \nIf the user attempts to set the `isAdmin` key, their request will be rejected:\n \n```js\nconst props = JSON5.parse('{\"foo\": \"bar\", \"isAdmin\": true}');\nif (!secCheckKeysSet(props, ['isAdmin', 'isMod'])) {\n  doSomethingDangerous(props);\n} else {\n  throw new Error('Forbidden...'); // Error: Forbidden...\n}\n```\n \nHowever, users can instead set the `__proto__` key to `{\"isAdmin\": true}`. `JSON5` will parse this key and will set the `isAdmin` key on the prototype of the returned object, allowing the user to bypass the security check and run their request as an admin:\n \n```js\nconst props = JSON5.parse('{\"foo\": \"bar\", \"__proto__\": {\"isAdmin\": true}}');\nif (!secCheckKeysSet(props, ['isAdmin', 'isMod'])) {\n  doSomethingDangerous(props); // \"Doing dangerous thing as admin.\"\n} else {\n  throw new Error('Forbidden...');\n}\n ```",
          summary: "Prototype Pollution in JSON5 via Parse Method",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths:
            "react-scripts 5.0.1 -> eslint-config-react-app 7.0.1 -> eslint-plugin-import 2.26.0 -> tsconfig-paths 3.14.1 -> json5 1.0.1",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "HIGH",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2022-46175",
        vulnerability_description:
          "Prototype Pollution in JSON5 via Parse Method",
        vulnerable_component: "json5",
        vulnerable_component_version: "1.0.1",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 7.1,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 29560,
            start_position: 29559,
            end_position: 29559,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "json5",
        package_version: "1.0.1",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> eslint-config-react-app 7.0.1 -> eslint-plugin-import 2.26.0 -> tsconfig-paths 3.14.1 -> json5 1.0.1",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 29560,
        start_position: 29559,
        end_position: 29559,
      },
      type: "vulnerable_code_dependency",
      severity: "High",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'json5' referenced in project 'Users/zeari/projects/higene/app': Prototype Pollution in JSON5 via Parse Method",
    },
    {
      detection_details: {
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        manifest_file_path: "Users/zeari/projects/higene/app/package.json",
        ecosystem: "NPM",
        package_name: "axe-core",
        package_version: "4.5.1",
        license: "MPL-2.0",
        source_url: "https://github.com/dequelabs/axe-core",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> eslint-config-react-app 7.0.1 -> eslint-plugin-jsx-a11y 6.6.1 -> axe-core 4.5.1",
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 21625,
        start_position: 21624,
        end_position: 21624,
      },
      type: "Non permissive license",
      severity: "Medium",
      detection_rule_id: "f0dd0af9-9196-40bd-aa43-7230dc711399",
      detection_type_id: "8f681450-49e1-4f7e-85b7-0c8fe84b3a35",
      message: "Package axe-core has non-permissive license.",
    },
    {
      detection_details: {
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        manifest_file_path: "Users/zeari/projects/higene/app/package.json",
        ecosystem: "NPM",
        package_name: "node-forge",
        package_version: "1.3.1",
        license: "BSD-3-Clause,GPL-2.0-only",
        source_url: "https://github.com/digitalbazaar/forge",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> webpack-dev-server 4.11.1 -> selfsigned 2.1.1 -> node-forge 1.3.1",
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 26902,
        start_position: 26901,
        end_position: 26901,
      },
      type: "Non permissive license",
      severity: "Medium",
      detection_rule_id: "f0dd0af9-9196-40bd-aa43-7230dc711399",
      detection_type_id: "8f681450-49e1-4f7e-85b7-0c8fe84b3a35",
      message: "Package node-forge has non-permissive license.",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::webpack::5.75.0",
        alert: {
          affected_package_name: "webpack",
          package_description:
            "Packs CommonJs/AMD modules for the browser. Allows to split your codebase into multiple bundles, which can be loaded on demand. Support loaders to preprocess files, i.e. json, jsx, es7, css, less, ... and your custom stuff.",
          cve_identifier: "CVE-2023-28154",
          ghsa_identifier: "GHSA-hc6q-2mpp-qw7j",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "5.75.0",
          first_patched_version: "5.76.0",
          severity: "HIGH",
          ecosystem: "NPM",
          description:
            "Webpack 5 before 5.76.0 does not avoid cross-realm object access. ImportParserPlugin.js mishandles the magic comment feature. An attacker who controls a property of an untrusted object can obtain access to the real global object.",
          summary: "Cross-realm object access in Webpack 5",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths: "react-scripts 5.0.1 -> webpack 5.75.0",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "HIGH",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2023-28154",
        vulnerability_description: "Cross-realm object access in Webpack 5",
        vulnerable_component: "webpack",
        vulnerable_component_version: "5.75.0",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 7.6,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 29827,
            start_position: 29826,
            end_position: 29826,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "webpack",
        package_version: "5.75.0",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths: "react-scripts 5.0.1 -> webpack 5.75.0",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 29827,
        start_position: 29826,
        end_position: 29826,
      },
      type: "vulnerable_code_dependency",
      severity: "High",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'webpack' referenced in project 'Users/zeari/projects/higene/app': Cross-realm object access in Webpack 5",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::nth-check::1.0.2",
        alert: {
          affected_package_name: "nth-check",
          package_description: "performant nth-check parser & compiler",
          cve_identifier: "CVE-2021-3803",
          ghsa_identifier: "GHSA-rp65-9cf3-cjxr",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "1.0.2",
          first_patched_version: "2.0.1",
          severity: "HIGH",
          ecosystem: "NPM",
          description:
            "nth-check is vulnerable to Inefficient Regular Expression Complexity",
          summary: "Inefficient Regular Expression Complexity in nth-check",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths:
            "react-scripts 5.0.1 -> @svgr/webpack 5.5.0 -> @svgr/plugin-svgo 5.5.0 -> svgo 1.3.2 -> nth-check 1.0.2",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "HIGH",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2021-3803",
        vulnerability_description:
          "Inefficient Regular Expression Complexity in nth-check",
        vulnerable_component: "nth-check",
        vulnerable_component_version: "1.0.2",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 7.5,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 29343,
            start_position: 29342,
            end_position: 29342,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "nth-check",
        package_version: "1.0.2",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> @svgr/webpack 5.5.0 -> @svgr/plugin-svgo 5.5.0 -> svgo 1.3.2 -> nth-check 1.0.2",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 29343,
        start_position: 29342,
        end_position: 29342,
      },
      type: "vulnerable_code_dependency",
      severity: "High",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'nth-check' referenced in project 'Users/zeari/projects/higene/app': Inefficient Regular Expression Complexity in nth-check",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::json5::2.2.1",
        alert: {
          affected_package_name: "json5",
          package_description: "JSON for humans.",
          cve_identifier: "CVE-2022-46175",
          ghsa_identifier: "GHSA-9c47-m6qq-7p4h",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "2.2.1",
          first_patched_version: "2.2.2",
          severity: "HIGH",
          ecosystem: "NPM",
          description:
            "The `parse` method of the JSON5 library before and including version `2.2.1` does not restrict parsing of keys named `__proto__`, allowing specially crafted strings to pollute the prototype of the resulting object.\n\nThis vulnerability pollutes the prototype of the object returned by `JSON5.parse` and not the global Object prototype, which is the commonly understood definition of Prototype Pollution. However, polluting the prototype of a single object can have significant security impact for an application if the object is later used in trusted operations.\n\n## Impact\nThis vulnerability could allow an attacker to set arbitrary and unexpected keys on the object returned from `JSON5.parse`. The actual impact will depend on how applications utilize the returned object and how they filter unwanted keys, but could include denial of service, cross-site scripting, elevation of privilege, and in extreme cases, remote code execution.\n\n## Mitigation\nThis vulnerability is patched in json5 v2.2.2 and later. A patch has also been backported for json5 v1 in versions v1.0.2 and later.\n\n## Details\n \nSuppose a developer wants to allow users and admins to perform some risky operation, but they want to restrict what non-admins can do. To accomplish this, they accept a JSON blob from the user, parse it using `JSON5.parse`, confirm that the provided data does not set some sensitive keys, and then performs the risky operation using the validated data:\n \n```js\nconst JSON5 = require('json5');\n\nconst doSomethingDangerous = (props) => {\n  if (props.isAdmin) {\n    console.log('Doing dangerous thing as admin.');\n  } else {\n    console.log('Doing dangerous thing as user.');\n  }\n};\n\nconst secCheckKeysSet = (obj, searchKeys) => {\n  let searchKeyFound = false;\n  Object.keys(obj).forEach((key) => {\n    if (searchKeys.indexOf(key) > -1) {\n      searchKeyFound = true;\n    }\n  });\n  return searchKeyFound;\n};\n\nconst props = JSON5.parse('{\"foo\": \"bar\"}');\nif (!secCheckKeysSet(props, ['isAdmin', 'isMod'])) {\n  doSomethingDangerous(props); // \"Doing dangerous thing as user.\"\n} else {\n  throw new Error('Forbidden...');\n}\n```\n \nIf the user attempts to set the `isAdmin` key, their request will be rejected:\n \n```js\nconst props = JSON5.parse('{\"foo\": \"bar\", \"isAdmin\": true}');\nif (!secCheckKeysSet(props, ['isAdmin', 'isMod'])) {\n  doSomethingDangerous(props);\n} else {\n  throw new Error('Forbidden...'); // Error: Forbidden...\n}\n```\n \nHowever, users can instead set the `__proto__` key to `{\"isAdmin\": true}`. `JSON5` will parse this key and will set the `isAdmin` key on the prototype of the returned object, allowing the user to bypass the security check and run their request as an admin:\n \n```js\nconst props = JSON5.parse('{\"foo\": \"bar\", \"__proto__\": {\"isAdmin\": true}}');\nif (!secCheckKeysSet(props, ['isAdmin', 'isMod'])) {\n  doSomethingDangerous(props); // \"Doing dangerous thing as admin.\"\n} else {\n  throw new Error('Forbidden...');\n}\n ```",
          summary: "Prototype Pollution in JSON5 via Parse Method",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths:
            "react-scripts 5.0.1 -> @babel/core 7.20.2 -> json5 2.2.1",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "HIGH",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2022-46175",
        vulnerability_description:
          "Prototype Pollution in JSON5 via Parse Method",
        vulnerable_component: "json5",
        vulnerable_component_version: "2.2.1",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 7.1,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 26428,
            start_position: 26427,
            end_position: 26427,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "json5",
        package_version: "2.2.1",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> @babel/core 7.20.2 -> json5 2.2.1",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 26428,
        start_position: 26427,
        end_position: 26427,
      },
      type: "vulnerable_code_dependency",
      severity: "High",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'json5' referenced in project 'Users/zeari/projects/higene/app': Prototype Pollution in JSON5 via Parse Method",
    },
    {
      detection_details: {
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        manifest_file_path: "Users/zeari/projects/higene/app/package.json",
        ecosystem: "NPM",
        package_name: "jszip",
        package_version: "3.10.1",
        license: "MIT,GPL-3.0-or-later",
        source_url: "https://github.com/Stuk/jszip",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "firebase 9.14.0 -> @firebase/auth 0.20.11 -> selenium-webdriver 4.5.0 -> jszip 3.10.1",
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 26456,
        start_position: 26455,
        end_position: 26455,
      },
      type: "Non permissive license",
      severity: "Medium",
      detection_rule_id: "f0dd0af9-9196-40bd-aa43-7230dc711399",
      detection_type_id: "8f681450-49e1-4f7e-85b7-0c8fe84b3a35",
      message: "Package jszip has non-permissive license.",
    },
    {
      detection_details: {
        repository_project_id:
          "Repository::Users/zeari/projects/higene/app::NPM",
        package_version_id: "NPM::semver::6.3.0",
        alert: {
          affected_package_name: "semver",
          package_description: "The semantic version parser used by npm.",
          cve_identifier: "CVE-2022-25883",
          ghsa_identifier: "GHSA-c2qf-rxjj-qqgw",
          project_path: "Users/zeari/projects/higene/app",
          file_path: "Users/zeari/projects/higene/app/package.json",
          lock_file_path: "Users/zeari/projects/higene/app/package-lock.json",
          vulnerable_requirements: "6.3.0",
          first_patched_version: "7.5.2",
          severity: "MEDIUM",
          ecosystem: "NPM",
          description:
            "Versions of the package semver before 7.5.2 are vulnerable to Regular Expression Denial of Service (ReDoS) via the function new Range, when untrusted user data is provided as a range.\n\n\n",
          summary: "semver vulnerable to Regular Expression Denial of Service",
          entity_id: null,
          is_direct_dependency: false,
          is_dev_dependency: false,
          dependency_paths:
            "react-scripts 5.0.1 -> @babel/core 7.20.2 -> semver 6.3.0",
          affected_package_is_specific_version: true,
          affected_package_manifest_version: null,
          resolving_method_type: "CommittedLockfile",
        },
        advisory_severity: "MEDIUM",
        organization_id: "Organization",
        repository_id: "Repository",
        repository_name: "Repository",
        detection_source: "Cycode",
        vulnerability_id: "CVE-2022-25883",
        vulnerability_description:
          "semver vulnerable to Regular Expression Denial of Service",
        vulnerable_component: "semver",
        vulnerable_component_version: "6.3.0",
        vulnerable_resource: "Repository",
        package_ecosystem: "NPM",
        cvss_score: 5.3,
        file_storage_details: [
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package.json_d038f2df-419c-43cb-9769-7ebd23f89ac3.json",
              folder: "manifest-files",
              size: 3340,
            },
            file_name: "Users/zeari/projects/higene/app/package.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 51,
            start_position: 50,
            end_position: 50,
          },
          {
            storage_details: {
              path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
              folder: "manifest-files",
              size: 1721569,
            },
            file_name: "Users/zeari/projects/higene/app/package-lock.json",
            file_path: "Users/zeari/projects/higene/app",
            file_extension: ".json",
            line_in_file: 17839,
            start_position: 17838,
            end_position: 17838,
          },
        ],
        unique_resource_id:
          "Organization::Repository::Users/zeari/projects/higene/app/package.json",
        build_tool: "npm",
        package_name: "semver",
        package_version: "6.3.0",
        ecosystem: "NPM",
        is_direct_dependency: false,
        is_direct_dependency_str: "No",
        is_dev_dependency: false,
        is_dev_dependency_str: "No",
        dependency_paths:
          "react-scripts 5.0.1 -> @babel/core 7.20.2 -> semver 6.3.0",
        storage_details: {
          path: "CycodeCli_Organization_Repository_NPM_Users_zeari_projects_higene_app_package-lock.json_39d9c6ab-2b18-4baf-8d0b-5c1206de914b.json",
          folder: "manifest-files",
          size: 1721569,
        },
        file_name: "/Users/zeari/projects/higene/app/package-lock.json",
        file_path: "Users/zeari/projects/higene/app",
        file_extension: ".json",
        project_path: "Users/zeari/projects/higene/app",
        line: -1,
        line_in_file: 17839,
        start_position: 17838,
        end_position: 17838,
      },
      type: "vulnerable_code_dependency",
      severity: "Medium",
      detection_rule_id: "a080b024-ca59-4be2-9ccb-8d301d9670aa",
      detection_type_id: "9369d10a-9ac0-48d3-9921-5de7fe9a37a7",
      message:
        "Security vulnerability in package 'semver' referenced in project 'Users/zeari/projects/higene/app': semver vulnerable to Regular Expression Denial of Service",
    },
  ],
};
