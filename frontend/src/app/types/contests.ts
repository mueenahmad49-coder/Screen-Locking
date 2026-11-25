
export type ContestStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  status: ContestStatus;
  created_at: string;
  updated_at: string;
}

export interface ContestData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  status: ContestStatus;
}

export interface Registration {
  id: number;
  contest: number;
  contest_title: string;
  participant: number;
  participant_email: string;
  registered_at: string;
}
