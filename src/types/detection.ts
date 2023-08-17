export type Detection = {
  type: string;
  detection_rule_id: string;
  detection_type_id: string;
  severity: string;
  message: string;
  detection_details: {
    sha512: string;
    length: number;
    start_position: number;
    line: number;
    committed_at: string;
    file_path: string;
    file_name: string;
    file_extension: string;
    should_resolve_upon_branch_deletion: boolean;
  };
};

export type ScaDetection = {
  type: string;
  detection_rule_id: string;
  detection_type_id: string;
  message: string;
  severity: string;
  detection_details: {
    file_name: string;
    start_position: number;
    end_position: number;
    line: number;
    line_in_file: number;
    package_name: string;
    package_version: string;
    alert?: {
      severity: string;
      summary: string;
      vulnerable_requirements: string;
      first_patched_version: string;
    };
  };
};

export type AnyDetection = Detection | ScaDetection;
