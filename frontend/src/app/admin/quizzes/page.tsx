
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/hooks/use-auth";
import { getContests } from "@/app/services/contests";
import {
  createQuizQuestion,
  getAdminQuestions,
} from "../../services/quizzes";
import type { Contest } from "@/app/types/contests";
import type { QuizQuestion } from "@/app/types/quiz";

export default function AdminQuizzesPage() {
  const { user, loading: authLoading } = useAuth();

  const [contests, setContests] = useState<Contest[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedContest, setSelectedContest] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [marks, setMarks] = useState("2");
  const [order, setOrder] = useState("1");

  const [options, setOptions] = useState([
    { option_text: "", is_correct: true, order: 1 },
    { option_text: "", is_correct: false, order: 2 },
    { option_text: "", is_correct: false, order: 3 },
    { option_text: "", is_correct: false, order: 4 },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [contestData, questionData] = await Promise.all([
        getContests(),
        getAdminQuestions(),
      ]);

      setContests(contestData);
      setQuestions(questionData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load quiz data."
      );
    } finally {
      setLoading(false);
    }
  }, []);
useEffect(() => {
  if (!authLoading && user?.role === "ADMIN") {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }
}, [authLoading, user, loadData]);

  const handleOptionChange = (
    index: number,
    value: string
  ) => {
    setOptions((current) =>
      current.map((option, i) =>
        i === index ? { ...option, option_text: value } : option
      )
    );
  };

  const handleCorrectOption = (index: number) => {
    setOptions((current) =>
      current.map((option, i) => ({
        ...option,
        is_correct: i === index,
      }))
    );
  };

  const resetForm = () => {
    setQuestionText("");
    setMarks("2");
    setOrder(String(questions.length + 1));

    setOptions([
      { option_text: "", is_correct: true, order: 1 },
      { option_text: "", is_correct: false, order: 2 },
      { option_text: "", is_correct: false, order: 3 },
      { option_text: "", is_correct: false, order: 4 },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedContest) {
      setError("Please select a contest.");
      return;
    }

    if (!questionText.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (options.some((option) => !option.option_text.trim())) {
      setError("Please fill in all four options.");
      return;
    }

    if (!options.some((option) => option.is_correct)) {
      setError("Please select the correct answer.");
      return;
    }

    if (Number(marks) <= 0 || Number(order) <= 0) {
      setError("Marks and question order must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      await createQuizQuestion({
        contest: Number(selectedContest),
        question_text: questionText.trim(),
        marks: Number(marks),
        order: Number(order),
        options: options.map((option) => ({
          ...option,
          option_text: option.option_text.trim(),
        })),
      });

      setSuccess("Question added successfully.");
      resetForm();

      const updatedQuestions = await getAdminQuestions();
      setQuestions(updatedQuestions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to add question."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="p-8">
        <p className="text-red-600">You are not authorized to access this page.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-600">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const contestQuestions = questions.filter(
    (question) => question.contest === Number(selectedContest)
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quiz Management
            </h1>
            <p className="mt-2 text-gray-600">
              Create and manage contest quiz questions.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
          >
            Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">
            {success}
          </div>
        )}

        <section className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Select Contest</h2>

          <select
            value={selectedContest}
            onChange={(e) => setSelectedContest(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3"
          >
            <option value="">Choose a contest</option>
            {contests.map((contest) => (
              <option key={contest.id} value={contest.id}>
                {contest.title}
              </option>
            ))}
          </select>
        </section>

        {selectedContest && (
          <>
            <section className="mb-8 rounded-xl bg-white p-6 shadow">
              <h2 className="mb-6 text-xl font-semibold">
                Add New Question
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block font-medium">
                    Question
                  </label>
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3"
                    rows={3}
                    placeholder="Enter your question"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-medium">
                      Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-3"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Question Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-3"
                      required
                    />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">Options</h3>
                  <p className="mb-4 text-sm text-gray-500">
                    Enter four options and select the radio button beside
                    the correct answer.
                  </p>

                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="radio"
                          name="correctOption"
                          checked={option.is_correct}
                          onChange={() => handleCorrectOption(index)}
                          className="h-4 w-4"
                          aria-label={`Mark option ${index + 1} as correct`}
                        />

                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) =>
                            handleOptionChange(index, e.target.value)
                          }
                          placeholder={`Option ${index + 1}`}
                          className="w-full rounded-lg border border-gray-300 p-3"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Adding Question..." : "Add Question"}
                </button>
              </form>
            </section>

            <section className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">
                Existing Questions ({contestQuestions.length})
              </h2>

              {contestQuestions.length === 0 ? (
                <p className="text-gray-500">
                  No questions have been added to this contest yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {contestQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-semibold">
                          {question.order}. {question.question_text}
                        </h3>
                        <span className="text-sm text-gray-600">
                          {question.marks} marks
                        </span>
                      </div>

                      <ul className="mt-3 space-y-2">
                        {question.options.map((option) => (
                          <li
                            key={option.id}
                            className="text-sm text-gray-700"
                          >
                            {option.order}. {option.option_text}
                            {option.is_correct && (
                              <span className="ml-2 font-medium text-green-600">
                                (Correct)
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
