
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


export interface QuizAnswerResult {
    question: number;
    question_text: string;
    selected_option: number;
    selected_option_text: string;
    is_correct: boolean;
    marks: number;
}


export interface QuizSessionResponse {
    message: string;
    session_token: string;
    heartbeat_interval: number;
    session_timeout: number;
}


export interface QuizSessionStatus {
    message: string;
    is_active: boolean;
}


// Admin Quiz Questions

export async function getAdminQuestions() {
    return apiRequest<QuizQuestion[]>(
        "/quizzes/admin/questions/"
    );
}


export async function createQuizQuestion(
    data: QuizQuestionData
) {
    return apiRequest<QuizQuestion>(
        "/quizzes/admin/questions/",
        {
            method: "POST",
            body: JSON.stringify(data),
        }
    );
}


// Start Quiz Session

export async function startQuizSession(
    contestId: number
): Promise<QuizSessionResponse> {

    return apiRequest<QuizSessionResponse>(
        `/quizzes/contests/${contestId}/session/start/`,
        {
            method: "POST",
        }
    );
}


// Quiz Session Heartbeat

export async function sendQuizHeartbeat(
    contestId: number,
    sessionToken: string
): Promise<QuizSessionStatus> {

    return apiRequest<QuizSessionStatus>(
        `/quizzes/contests/${contestId}/session/heartbeat/`,
        {
            method: "POST",
            body: JSON.stringify({
                session_token: sessionToken,
            }),
        }
    );
}


// End Quiz Session

export async function endQuizSession(
    contestId: number,
    sessionToken: string
): Promise<QuizSessionStatus> {

    return apiRequest<QuizSessionStatus>(
        `/quizzes/contests/${contestId}/session/end/`,
        {
            method: "POST",
            body: JSON.stringify({
                session_token: sessionToken,
            }),
        }
    );
}


// Participant Quiz Questions

export async function getContestQuestions(
    contestId: number,
    sessionToken: string
) {

    return apiRequest<QuizQuestion[]>(
        `/quizzes/contests/${contestId}/questions/`,
        {
            headers: {
                "X-Quiz-Session": sessionToken,
            },
        }
    );
}


// Contest Timing

export async function getContestTiming(
    contestId: number
): Promise<ContestTiming> {

    return apiRequest<ContestTiming>(
        `/quizzes/contests/${contestId}/timing/`
    );
}


// Submit Quiz

export async function submitQuiz(
    contestId: number,
    answers: {
        question_id: number;
        selected_option_id: number;
    }[],
    sessionToken: string
) {

    const response = await apiRequest<{
        message: string;
        result: QuizSubmission;
    }>(
        `/quizzes/contests/${contestId}/submit/`,
        {
            method: "POST",

            headers: {
                "X-Quiz-Session": sessionToken,
            },

            body: JSON.stringify({
                answers,
            }),
        }
    );

    return response.result;
}


// Get Participant Submission

export async function getQuizSubmission(
    submissionId: number
) {

    return apiRequest<QuizSubmission>(
        `/quizzes/submissions/${submissionId}/`
    );
}


// Admin Quiz Submissions

export async function getQuizSubmissions(
    contestId?: number
) {

    const endpoint = contestId
        ? `/quizzes/admin/submissions/?contest=${contestId}`
        : "/quizzes/admin/submissions/";

    return apiRequest<QuizSubmission[]>(endpoint);
}


// Get Quiz Submission Answers

export async function getQuizSubmissionAnswers(
    submissionId: number
) {

    return apiRequest<QuizAnswerResult[]>(
        `/quizzes/submissions/${submissionId}/answers/`
    );
}
