
import { apiRequest } from "./api";
import type {
  QuizQuestion,
  QuizQuestionData,
  QuizSubmission,
} from "@/app/types/quiz";


export interface ContestTiming {
  server_time: string;
  start_time: string;
  end_time: string;
  status: "UPCOMING" | "ONGOING" | "ENDED";
}

export async function getAdminQuestions(): Promise<QuizQuestion[]> {
  return apiRequest<QuizQuestion[]>("/quizzes/admin/questions/");
}

export async function createQuizQuestion(
  data: QuizQuestionData
): Promise<QuizQuestion> {
  return apiRequest<QuizQuestion>("/quizzes/admin/questions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getContestQuestions(
  contestId: number
): Promise<QuizQuestion[]> {
  return apiRequest<QuizQuestion[]>(
    `/quizzes/contests/${contestId}/questions/`
  );
}


export async function getContestTiming(
  contestId: number
): Promise<ContestTiming> {
  return apiRequest<ContestTiming>(
    `/quizzes/contests/${contestId}/timing/`
  );
}


export async function submitQuiz(
  contestId: number,
  answers: {
    question_id: number;
    selected_option_id: number;
  }[]
) {
  const response = await apiRequest<{
    message: string;
    result: {
      id: number;
      contest: number;
      contest_title: string;
      participant: number;
      participant_email: string;
      score: number;
      submitted_at: string;
    };
  }>(`/quizzes/contests/${contestId}/submit/`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });

  return response.result;
}


export async function getQuizSubmission(
  submissionId: number
) {
  return apiRequest<QuizSubmission>(
    `/quizzes/submissions/${submissionId}/`
  );
}

export async function getQuizSubmissions(
  contestId?: number
): Promise<QuizSubmission[]> {
  const endpoint = contestId
    ? `/quizzes/admin/submissions/?contest=${contestId}`
    : "/quizzes/admin/submissions/";

  return apiRequest<QuizSubmission[]>(endpoint);
}


export interface QuizAnswerResult {
  question: number;
  question_text: string;
  selected_option: number;
  selected_option_text: string;
  is_correct: boolean;
  marks: number;
}
export async function getQuizSubmissionAnswers(
  submissionId: number
): Promise<QuizAnswerResult[]> {
  return apiRequest<QuizAnswerResult[]>(
    `/quizzes/submissions/${submissionId}/answers/`
  );
}
