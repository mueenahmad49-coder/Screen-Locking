
export interface QuizOption {
  id: number;
  option_text: string;
  is_correct?: boolean;
  order: number;
}

export interface QuizQuestion {
  id: number;
  contest: number;
  question_text: string;
  marks: number;
  order: number;
  options: QuizOption[];
  created_at: string;
  updated_at: string;
}

export interface QuizOptionData {
  option_text: string;
  is_correct: boolean;
  order: number;
}

export interface QuizQuestionData {
  contest: number;
  question_text: string;
  marks: number;
  order: number;
  options: QuizOptionData[];
}

export interface QuizSubmission {
  id: number;
  contest: number;
  contest_title: string;
  participant: number;
  participant_email: string;
  score: number;
  submitted_at: string;
}
