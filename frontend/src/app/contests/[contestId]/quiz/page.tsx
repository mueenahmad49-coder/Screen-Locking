"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/app/hooks/use-auth";

import {
  getContestQuestions,
  getContestTiming,
  submitQuiz,
  getQuizSubmissionAnswers,
  startQuizSession,
  sendQuizHeartbeat,
  endQuizSession,
  type QuizAnswerResult,
  type ContestTiming,
  type QuizSessionResponse,
} from "@/app/services/quizzes";

import type { QuizQuestion } from "@/app/types/quiz";


function formatTime(milliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / 1000)
  );

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

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

  const isParticipant =
    !authLoading && user?.role === "PARTICIPANT";


  const [questions, setQuestions] =
    useState<QuizQuestion[]>([]);

  const [answers, setAnswers] =
    useState<Record<number, number>>({});

  const [results, setResults] =
    useState<QuizAnswerResult[]>([]);

  const [timing, setTiming] =
    useState<ContestTiming | null>(null);

  const [clockOffsetMs, setClockOffsetMs] =
    useState<number | null>(null);

  const [clientNowMs, setClientNowMs] =
    useState<number | null>(null);

  const [score, setScore] =
    useState<number | null>(null);

  const [submissionId, setSubmissionId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [questionsLoading, setQuestionsLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");


  // Quiz session states

  const [sessionToken, setSessionToken] =
    useState<string | null>(null);

  const [sessionError, setSessionError] =
    useState("");

  const [heartbeatInterval, setHeartbeatInterval] =
    useState(15);

  const [sessionLoading, setSessionLoading] =
    useState(true);

  const [closing, setClosing] = useState(false);


  const sessionRequest = useRef<
    Promise<QuizSessionResponse> | null
  >(null);

  const questionsRequested = useRef(false);

  const submissionCompleted = useRef(false);

  const submissionInProgress = useRef(false);

  const closingRef = useRef(false);


  // Synchronize official contest time

  const syncTiming = useCallback(async () => {

    try {

      const requestStartedAt = performance.now();

      const data = await getContestTiming(contestId);

      const requestFinishedAt = performance.now();

      const requestMidpoint =
        (requestStartedAt + requestFinishedAt) / 2;

      const serverTimestamp =
        new Date(data.server_time).getTime();

      if (!Number.isFinite(serverTimestamp)) {
        throw new Error(
          "Invalid server time received."
        );
      }

      setClockOffsetMs(
        serverTimestamp - requestMidpoint
      );

      setTiming(data);

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


  // Synchronize time every 30 seconds

  useEffect(() => {

    if (!isParticipant) {
      return;
    }

    const initialSync = window.setTimeout(() => {
      void syncTiming();
    }, 0);

    const synchronizationInterval =
      window.setInterval(() => {
        void syncTiming();
      }, 30000);

    return () => {

      window.clearTimeout(initialSync);

      window.clearInterval(
        synchronizationInterval
      );

    };

  }, [syncTiming, isParticipant]);


  // Update countdown every second

  useEffect(() => {

    if (clockOffsetMs === null) {
      return;
    }

    const updateClock = () => {
      setClientNowMs(performance.now());
    };

    const initialClock = window.setTimeout(
      updateClock,
      0
    );

    const timerInterval = window.setInterval(
      updateClock,
      1000
    );

    return () => {

      window.clearTimeout(initialClock);

      window.clearInterval(timerInterval);

    };

  }, [clockOffsetMs]);


  const serverNowMs =
    clientNowMs !== null && clockOffsetMs !== null
      ? clientNowMs + clockOffsetMs
      : null;


  const startTimestamp = timing
    ? new Date(timing.start_time).getTime()
    : null;

  const endTimestamp = timing
    ? new Date(timing.end_time).getTime()
    : null;


  let contestStatus:
    | "UPCOMING"
    | "ONGOING"
    | "ENDED"
    | null = null;


  if (
    serverNowMs !== null &&
    startTimestamp !== null &&
    endTimestamp !== null
  ) {

    if (serverNowMs < startTimestamp) {

      contestStatus = "UPCOMING";

    } else if (serverNowMs < endTimestamp) {

      contestStatus = "ONGOING";

    } else {

      contestStatus = "ENDED";

    }

  }


  const remainingTime =
    serverNowMs !== null && endTimestamp !== null
      ? Math.max(0, endTimestamp - serverNowMs)
      : null;


  const timeUntilStart =
    serverNowMs !== null && startTimestamp !== null
      ? Math.max(0, startTimestamp - serverNowMs)
      : null;


  const contestAvailable =
    contestStatus === "UPCOMING" ||
    contestStatus === "ONGOING";


  // Start a single active quiz session

  useEffect(() => {

    if (!isParticipant || !contestAvailable) {
      return;
    }

    let cancelled = false;

    if (!sessionRequest.current) {

      sessionRequest.current =
        startQuizSession(contestId);

    }

    const request = sessionRequest.current;

    request
      .then((data) => {

        if (cancelled) {
          return;
        }

        setSessionToken(data.session_token);

        setHeartbeatInterval(
          data.heartbeat_interval
        );

        setSessionError("");

        setSessionLoading(false);

      })
      .catch((err) => {

        if (cancelled) {
          return;
        }

        setSessionError(
          err instanceof Error
            ? err.message
            : "Unable to start quiz session."
        );

        setSessionLoading(false);

      });

    return () => {

      cancelled = true;

    };

  }, [
    contestId,
    isParticipant,
    contestAvailable,
  ]);


  // Send heartbeat to backend

  useEffect(() => {

    if (
      !sessionToken ||
      !contestAvailable ||
      !isParticipant ||
      score !== null ||
      closing
    ) {
      return;
    }

    let cancelled = false;

    let heartbeatRunning = false;

    const heartbeat = async () => {

      if (
        heartbeatRunning ||
        submissionCompleted.current ||
        submissionInProgress.current ||
        closingRef.current
      ) {
        return;
      }

      heartbeatRunning = true;

      try {

        const response = await sendQuizHeartbeat(
          contestId,
          sessionToken
        );

        if (
          !response.is_active &&
          !cancelled &&
          !submissionCompleted.current &&
          !submissionInProgress.current &&
          !closingRef.current
        ) {

          setSessionError(
            "Your quiz session is no longer active."
          );

          setSessionToken(null);

        }

      } catch (err) {

        if (
          !cancelled &&
          !submissionCompleted.current &&
          !submissionInProgress.current &&
          !closingRef.current
        ) {

          setSessionError(
            err instanceof Error
              ? err.message
              : "Quiz session connection lost."
          );

          setSessionToken(null);

        }

      } finally {

        heartbeatRunning = false;

      }

    };

    const interval = window.setInterval(
      () => void heartbeat(),
      heartbeatInterval * 1000
    );

    return () => {

      cancelled = true;

      window.clearInterval(interval);

    };

  }, [
    contestId,
    sessionToken,
    heartbeatInterval,
    contestAvailable,
    isParticipant,
    score,
    closing,
  ]);


  // Close session after contest ends

  useEffect(() => {

    if (
      contestStatus !== "ENDED" ||
      !sessionToken ||
      submissionCompleted.current ||
      submissionInProgress.current
    ) {
      return;
    }

    void endQuizSession(
      contestId,
      sessionToken
    ).catch(() => {
      // Backend timeout handles failed close requests.
    });

  }, [
    contestId,
    contestStatus,
    sessionToken,
  ]);


  // Load questions with the session token

  const loadQuestions = useCallback(async () => {

    if (!sessionToken) {
      return;
    }

    setQuestionsLoading(true);

    try {

      const data = await getContestQuestions(
        contestId,
        sessionToken
      );

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

  }, [contestId, sessionToken]);


  useEffect(() => {

    if (
      contestStatus !== "ONGOING" ||
      !sessionToken ||
      !isParticipant ||
      questionsRequested.current
    ) {
      return;
    }

    const requestTimer = window.setTimeout(() => {

      questionsRequested.current = true;

      void loadQuestions();

    }, 0);

    return () => {

      window.clearTimeout(requestTimer);

    };

  }, [
    contestStatus,
    sessionToken,
    isParticipant,
    loadQuestions,
  ]);


  // Handle selected answer

  const handleAnswerChange = (
    questionId: number,
    optionId: number
  ) => {

    if (
      contestStatus !== "ONGOING" ||
      !sessionToken ||
      submitting ||
      closing
    ) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));

  };


  // Close the quiz session manually

  const handleCloseQuiz = async () => {

    if (
      closingRef.current ||
      submissionInProgress.current
    ) {
      return;
    }

    if (
      score === null &&
      sessionToken &&
      !window.confirm(
        "Leave this quiz? Your unsaved answers will be lost."
      )
    ) {
      return;
    }

    closingRef.current = true;

    setClosing(true);

    try {

      if (
        sessionToken &&
        !submissionCompleted.current
      ) {

        await endQuizSession(
          contestId,
          sessionToken
        );

      }

      window.close();

      if (!window.closed) {

        window.location.replace("/contests");

      }

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to close quiz session."
      );

      closingRef.current = false;

      setClosing(false);

    }

  };


  // Submit quiz using the active session token

  const handleSubmit = async () => {

    setError("");

    if (
      submissionInProgress.current ||
      submissionCompleted.current ||
      closingRef.current
    ) {
      return;
    }

    if (!sessionToken) {

      setError(
        "No active quiz session found."
      );

      return;

    }

    if (contestStatus !== "ONGOING") {

      setError(
        "The contest has ended or is not active."
      );

      return;

    }

    if (
      questions.length === 0 ||
      Object.keys(answers).length !==
        questions.length
    ) {

      setError(
        "Please answer every question before submitting."
      );

      return;

    }

    submissionInProgress.current = true;

    setSubmitting(true);

    try {

      const answerData = questions.map(
        (question) => ({
          question_id: question.id,
          selected_option_id:
            answers[question.id],
        })
      );

      const submission = await submitQuiz(
        contestId,
        answerData,
        sessionToken
      );

      submissionCompleted.current = true;

      setScore(submission.score);

      setSubmissionId(submission.id);

      setSessionToken(null);

      const answerResults =
        await getQuizSubmissionAnswers(
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

      submissionInProgress.current = false;

      setSubmitting(false);

    }

  };


  // Authentication loading

  if (authLoading) {

    return (
      <div className="p-8">
        Checking authentication...
      </div>
    );

  }


  // Participant authorization

  if (!user || user.role !== "PARTICIPANT") {

    return (

      <div className="p-8">

        <p className="text-red-600">
          You are not authorized to access this quiz.
        </p>

        <Link
          href="/dashboard"
          className="mt-4 inline-block text-blue-600"
        >
          Back to Dashboard
        </Link>

      </div>

    );

  }


  if (loading) {

    return (
      <div className="p-8">
        Synchronizing contest time...
      </div>
    );

  }


  if (!timing || serverNowMs === null) {

    return (

      <main className="min-h-screen p-8">

        <div className="mx-auto max-w-3xl">

          <p className="rounded-lg bg-red-100 p-4 text-red-700">

            {error ||
              "Unable to synchronize contest time."}

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


  // Show submission result

  if (score !== null) {

    return (

      <main className="min-h-screen bg-gray-50 p-6">

        <div className="mx-auto max-w-4xl">

          <section className="rounded-xl bg-white p-6 shadow">

            <h2 className="text-2xl font-bold text-green-700">

              Quiz Submitted Successfully!

            </h2>

            <div className="my-6 rounded-lg bg-blue-50 p-5">

              <p className="text-gray-600">
                Your Score
              </p>

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

                Your score is saved, but the answer
                breakdown is not available yet.

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

                      Your Answer:{" "}
                      {result.selected_option_text}

                    </p>

                    <p
                      className={`mt-2 font-medium ${
                        result.is_correct
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >

                      {result.is_correct
                        ? "Correct"
                        : "Incorrect"}

                    </p>

                  </div>

                ))}

              </div>

            )}

            <button
              onClick={() => void handleCloseQuiz()}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white"
            >

              Back to Contests

            </button>

          </section>

        </div>

      </main>

    );

  }


  // Block duplicate or invalid quiz sessions

  if (sessionError && contestStatus !== "ENDED") {

    return (

      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">

        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow">

          <h1 className="text-2xl font-bold text-red-600">

            Quiz Access Denied

          </h1>

          <p className="mt-4 text-gray-700">

            {sessionError}

          </p>

          <p className="mt-3 text-sm text-gray-500">

            Only one active quiz session is allowed
            for each participant in this contest.

          </p>

          {sessionError === "Another quiz window is already active." && (
            <p className="mt-4 text-sm text-gray-600">
              Close this duplicate window and return to your original quiz
              using Alt + Tab or the browser tab bar. Your original quiz
              session is not affected by this duplicate window.
            </p>
          )}

          <button
            onClick={() => void handleCloseQuiz()}
            className="mt-6 rounded-lg bg-red-600 px-6 py-3 text-white"
          >

            Close Quiz Window

          </button>

        </div>

      </main>

    );

  }


  // Wait until backend grants a session

  if (
    contestAvailable &&
    (sessionLoading || !sessionToken)
  ) {

    return (

      <main className="flex min-h-screen items-center justify-center">

        <p className="text-lg font-medium">

          Establishing secure quiz session...

        </p>

      </main>

    );

  }


  // Main quiz interface

  return (

    <main className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-4xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>

            <h1 className="text-3xl font-bold text-gray-900">

              Contest Quiz

            </h1>

            <p className="mt-2 text-gray-600">

              Answer all questions and submit before
              the official deadline.

            </p>

          </div>

          <button
            onClick={() => void handleCloseQuiz()}
            disabled={closing || submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
          >

            {closing
              ? "Closing..."
              : "Back to Contests"}

          </button>

        </div>


        {/* Active session indicator */}

        {sessionToken && contestAvailable && (

          <div className="mb-5 rounded-lg bg-green-100 p-4 text-green-700">

            Secure Quiz Session Active

          </div>

        )}


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

                The quiz will become available
                automatically when the contest starts.

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

                The contest ends according to the
                official server schedule.

              </p>

            </>

          )}


          {contestStatus === "ENDED" && (

            <>

              <p className="font-semibold text-red-700">

                Contest Ended

              </p>

              <p className="mt-2 text-gray-600">

                The official contest deadline has
                passed. Quiz submissions are closed.

              </p>

            </>

          )}

        </section>


        {error && (

          <div className="mb-5 rounded-lg bg-red-100 p-4 text-red-700">

            {error}

          </div>

        )}


        {/* Quiz questions */}

        {contestStatus === "ONGOING" &&
          sessionToken && (

          <>

            {questionsLoading ? (

              <div className="rounded-xl bg-white p-6 shadow">

                Loading quiz questions...

              </div>

            ) : questions.length === 0 ? (

              <div className="rounded-xl bg-white p-6 shadow">

                No questions are available for this contest.

                <button
                  onClick={() => void loadQuestions()}
                  className="ml-4 text-blue-600"
                >
                  Retry
                </button>

              </div>

            ) : (

              <>

                <div className="mb-5 rounded-lg bg-white p-4 shadow">

                  <p className="font-medium">

                    Total Questions: {questions.length}

                  </p>

                  <p className="mt-1 text-sm text-gray-500">

                    Answered: {Object.keys(answers).length}
                    {" "}of{" "}{questions.length}

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

                          Question {index + 1}:{" "}
                          {question.question_text}

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
                              checked={
                                answers[question.id] ===
                                option.id
                              }
                              onChange={() =>
                                handleAnswerChange(
                                  question.id,
                                  option.id
                                )
                              }
                              disabled={
                                contestStatus !== "ONGOING" ||
                                !sessionToken ||
                                submitting ||
                                closing
                              }
                              className="h-4 w-4"
                            />

                            <span>

                              {option.option_text}

                            </span>

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
                    closing ||
                    contestStatus !== "ONGOING" ||
                    questionsLoading ||
                    !sessionToken
                  }
                  className="mt-8 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >

                  {submitting
                    ? "Submitting..."
                    : "Submit Quiz"}

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
  const params = useParams<{ contestId: string }>();
  const [popupAllowed, setPopupAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let allowed = false;
    try {
      allowed = Boolean(
        window.opener &&
        !window.opener.closed &&
        window.opener.location.origin === window.location.origin &&
        window.name === `secureQuiz_${Number(params.contestId)}`
      );
    } catch {
      allowed = false;
    }
    const timer = window.setTimeout(() => setPopupAllowed(allowed), 0);
    return () => window.clearTimeout(timer);
  }, [params.contestId]);

  if (popupAllowed === null) {
    return <main className="p-8">Validating quiz window...</main>;
  }

  if (!popupAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-red-600">Quiz Access Denied</h1>
          <p className="mt-4 text-gray-700">Open the quiz using Attempt Quiz from Available Contests. Direct browser tab access is not allowed.</p>
          <Link href="/contests" className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white">Back to Contests</Link>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<main className="p-8">Loading quiz...</main>}>
      <QuizContent key={params.contestId} />
    </Suspense>
  );
}
