
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/app/hooks/use-auth";
import { getContests } from "@/app/services/contests";
import {
  getRegistrations,
  registerForContest,
} from "@/app/services/registrations";

import type { Contest, Registration } from "@/app/types/contests";

export default function ContestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [contests, setContests] = useState<Contest[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = user?.role === "ADMIN";

  const loadContests = useCallback(async () => {
    setError("");

    try {
      const contestData = await getContests();
      setContests(contestData);

      try {
        const registrationData = await getRegistrations();
        setRegistrations(registrationData);
      } catch {
        setRegistrations([]);
        setError("Contests loaded, but registrations could not be loaded.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load contests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadContests();
    }
  }, [authLoading, isAuthenticated, loadContests]);

  async function handleRegistration(contestId: number) {
    setRegisteringId(contestId);
    setError("");
    setSuccess("");

    try {
      await registerForContest(contestId);
      setSuccess("You have successfully registered for the contest.");
      await loadContests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
      );
    } finally {
      setRegisteringId(null);
    }
  }

  function isRegistered(contestId: number) {
    return registrations.some(
      (registration) => registration.contest === contestId
    );
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  if (authLoading || loading || !isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading contests...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isAdmin ? "Contest Management" : "Available Contests"}
            </h1>
            <p className="mt-2 text-slate-600">
              {isAdmin
                ? "View all contests and their current statuses."
                : "Explore published contests and register to participate."}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {contests.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">
              No contests found
            </h2>
            <p className="mt-2 text-slate-500">
              {isAdmin
                ? "No contests have been created yet."
                : "There are currently no published contests available."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {contests.map((contest) => (
              <article
                key={contest.id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {contest.title}
                  </h2>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      contest.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : contest.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {contest.status}
                  </span>
                </div>

                <p className="mb-5 text-sm leading-6 text-slate-600">
                  {contest.description}
                </p>

                <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <p>
                    <span className="font-semibold">Starts:</span>{" "}
                    {formatDate(contest.start_time)}
                  </p>

                  <p>
                    <span className="font-semibold">Ends:</span>{" "}
                    {formatDate(contest.end_time)}
                  </p>

                  <p>
                    <span className="font-semibold">
                      Registration Deadline:
                    </span>{" "}
                    {formatDate(contest.registration_deadline)}
                  </p>
                </div>

                {!isAdmin && contest.status === "PUBLISHED" && (
                  <div className="mt-5">
                    {isRegistered(contest.id) ? (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700">
                          Already Registered
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/contests/${contest.id}/quiz`)
                          }
                          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                        >
                          Attempt Quiz
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRegistration(contest.id)}
                        disabled={registeringId === contest.id}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registeringId === contest.id
                          ? "Registering..."
                          : "Register for Contest"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
