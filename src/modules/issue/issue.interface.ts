export interface IIssue {
  id: number;
  title: string;
  description: string;
    type: "bug" | "feature_request";
  status: "open" | "in_progress" | "resolved";
  created_at: Date;
  updated_at: Date;
  reporter_id: number;
  assignee_id?: number; // Optional field
}