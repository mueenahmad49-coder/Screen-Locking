
"use client";

import { Suspense, useCallback, useEffect, useState,useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/app/hooks/use-auth";
import {
  getContestQuestions,
  getContestTiming,
  submitQuiz,
  getQuizSubmissionAnswers,
  type QuizAnswerResult,
  type ContestTiming,
} from "@/app/services/quizzes";

import type { QuizQuestion } from "@/app/types/quiz";

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function QuizContent() {
  const params = useParams<{ contestId: string }>();
  const contestId = Number(params.contestId);

  const { user, loading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<QuizAnswerResult[]>([]);

  const [timing, setTiming] = useState<ContestTiming | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState<number | null>(null);
  
const [clientNowMs, setClientNowMs] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
 const questionsRequested = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Synchronize the browser with Django's official server time.
  const syncTiming = useCallback(async () => {
    try {
      const requestStartedAt = performance.now();

      const data = await getContestTiming(contestId);

      const requestFinishedAt = performance.now();

      // Estimate the time at which Django generated its response
      // using the midpoint of the request duration.
      const requestMidpoint =
        (requestStartedAt + requestFinishedAt) / 2;

      const serverTimestamp = new Date(data.server_time).getTime();

      if (!Number.isFinite(serverTimestamp)) {
        throw new Error("Invalid server time received.");
      }

      setClockOffsetMs(serverTimestamp - requestMidpoint);
      setTiming(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to synchronize contest time."
      );
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  // Initial synchronization and periodic synchronization.
  useEffect(() => {
  const initialSync = window.setTimeout(() => {
    void syncTiming();
  }, 0);

  const synchronizationInterval = window.setInterval(() => {
    void syncTiming();
  }, 30000);

  return () => {
    window.clearTimeout(initialSync);
    window.clearInterval(synchronizationInterval);
  };
}, [syncTiming]);

  // Update the displayed countdown every second.
  // Update the browser's monotonic clock every second.
useEffect(() => {
  if (clockOffsetMs === null) {
    return;
  }

  // Set the initial browser time immediately.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setClientNowMs(performance.now());

  const timerInterval = window.setInterval(() => {
    setClientNowMs(performance.now());
  }, 1000);

  return () => {
    window.clearInterval(timerInterval);
  };
}, [clockOffsetMs]);

  // Calculate official server time using the monotonic browser clock.
  const serverNowMs =
  clientNowMs !== null && clockOffsetMs !== null
    ? clientNowMs + clockOffsetMs
    : null;

  // Derive the contest state from official timestamps.
  let contestStatus: "UPCOMING" | "ONGOING" | "ENDED" | null = null;

  if (timing && serverNowMs !== null) {
    const startTimestamp = new Date(timing.start_time).getTime();
    const endTimestamp = new Date(timing.end_time).getTime();

    if (serverNowMs < startTimestamp) {
      contestStatus = "UPCOMING";
    } else if (serverNowMs < endTimestamp) {
      contestStatus = "ONGOING";
    } else {
      contestStatus = "ENDED";
    }
  }

  const startTimestamp = timing
    ? new Date(timing.start_time).getTime()
    : null;

  const endTimestamp = timing
    ? new Date(timing.end_time).getTime()
    : null;

  const remainingTime =
    serverNowMs !== null && endTimestamp !== null
      ? Math.max(0, endTimestamp - serverNowMs)
      : null;

  const timeUntilStart =
    serverNowMs !== null && startTimestamp !== null
      ? Math.max(0, startTimestamp - serverNowMs)
      : null;

  // Load quiz questions only when the official contest starts.
  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);

    try {
      const data = await getContestQuestions(contestId);
      setQuestions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load quiz questions."
      );
    } finally {
      setQuestionsLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
   if (
  contestStatus === "ONGOING" &&
  !questionsRequested.current
) {
  questionsRequested.current = true;
  loadQuestions();
}
  }, [contestStatus, questionsRequested, loadQuestions]);

  const handleAnswerChange = (
    questionId: number,
    optionId: number
  ) => {
    if (contestStatus !== "ONGOING") {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    setError("");

    if (contestStatus !== "ONGOING") {
      setError("The contest has ended or is not currently active.");
      return;
    }

    if (Object.keys(answers).length !== questions.length) {
      setError("Please answer every question before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const answerData = questions.map((question) => ({
        question_id: question.id,
        selected_option_id: answers[question.id],
      }));

      const submission = await submitQuiz(contestId, answerData);

      setScore(submission.score);
      setSubmissionId(submission.id);

      const answerResults = await getQuizSubmissionAnswers(
        submission.id
      );

      setResults(answerResults);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the quiz."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-8">Synchronizing contest time...</div>;
  }

  if (!user || user.role !== "PARTICIPANT") {
    return (
      <div className="p-8">
        <p className="text-red-600">
          You are not authorized to access this quiz.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-600">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!timing || serverNowMs === null) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-3xl">
          <p className="rounded-lg bg-red-100 p-4 text-red-700">
            {error || "Unable to synchronize contest time."}
          </p>
         <button
  onClick={() => void syncTiming()}
  className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white"
>
  Retry Synchronization
</button>
        </div>
      </main>
    );
  }

  // A submitted quiz should continue showing its result.
  if (score !== null) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold text-green-700">
              Quiz Submitted Successfully!
            </h2>

            <div className="my-6 rounded-lg bg-blue-50 p-5">
              <p className="text-gray-600">Your Score</p>
              <p className="text-4xl font-bold text-blue-700">
                {score}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Submission ID: {submissionId}
              </p>
            </div>

            <h3 className="mb-4 text-xl font-semibold">
              Answer Breakdown
            </h3>

            {results.length === 0 ? (
              <p className="text-gray-600">
                Your score is saved, but the answer breakdown could not be loaded.
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={result.question}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <p className="font-semibold">
                      {index + 1}. {result.question_text}
                    </p>

                    <p className="mt-2 text-gray-700">
                      Your Answer: {result.selected_option_text}
                    </p>

                    <p
                      className={`mt-2 font-medium ${
                        result.is_correct
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {result.is_correct ? "Correct" : "Incorrect"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/contests"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Back to Contests
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Contest Quiz
            </h1>
            <p className="mt-2 text-gray-600">
              Answer all questions and submit before the official deadline.
            </p>
          </div>

          <Link
            href="/contests"
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Back to Contests
          </Link>
        </div>

        {/* Official contest timer */}
        <section className="mb-6 rounded-xl bg-white p-6 text-center shadow">
          {contestStatus === "UPCOMING" && (
            <>
              <p className="font-semibold text-blue-700">
                Contest Starts In
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-blue-800">
                {formatTime(timeUntilStart ?? 0)}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                The quiz will become available automatically when the contest starts.
              </p>
            </>
          )}

          {contestStatus === "ONGOING" && (
            <>
              <p className="font-semibold text-green-700">
                Time Remaining
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-green-800">
                {formatTime(remainingTime ?? 0)}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                The contest ends according to the official server schedule.
              </p>
            </>
          )}

          {contestStatus === "ENDED" && (
            <>
              <p className="font-semibold text-red-700">
                Contest Ended
              </p>
              <p className="mt-2 text-gray-600">
                The official contest deadline has passed. Quiz submissions are closed.
              </p>
            </>
          )}
        </section>

        {error && (
          <div className="mb-5 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        {contestStatus === "ONGOING" && (
          <>
            {questionsLoading ? (
              <div className="rounded-xl bg-white p-6 shadow">
                Loading quiz questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                No questions are available for this contest.
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-lg bg-white p-4 shadow">
                  <p className="font-medium">
                    Total Questions: {questions.length}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Answered: {Object.keys(answers).length} of{" "}
                    {questions.length}
                  </p>
                </div>

                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <section
                      key={question.id}
                      className="rounded-xl bg-white p-6 shadow"
                    >
                      <div className="mb-4 flex flex-wrap justify-between gap-2">
                        <h2 className="text-lg font-semibold">
                          Question {index + 1}: {question.question_text}
                        </h2>

                        <span className="text-sm text-gray-500">
                          {question.marks} marks
                        </span>
                      </div>

                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <label
                            key={option.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option.id}
                              checked={answers[question.id] === option.id}
                              onChange={() =>
                                handleAnswerChange(
                                  question.id,
                                  option.id
                                )
                              }
                              disabled={contestStatus !== "ONGOING"}
                              className="h-4 w-4"
                            />

                            <span>{option.option_text}</span>
                          </label>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    contestStatus !== "ONGOING" ||
                    questionsLoading
                  }
                  className="mt-8 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </button>
              </>
            )}
          </>
        )}

      </div>
    </main>
  );
}

export default function ParticipantQuizPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">Loading quiz...</p>
        </main>
      }
    >
      <QuizContent />
    </Suspense>
  );
}
