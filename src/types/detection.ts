export type Detection = {
  type: string;
  detection_rule_id: string;
  detection_type_id: string;
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
