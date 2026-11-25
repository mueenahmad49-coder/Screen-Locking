
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/app/hooks/use-auth";
import {
  getContests,
  createContest,
  updateContest,
  deleteContest,
} from "@/app/services/contests";

import type { Contest, ContestData, ContestStatus } from "@/app/types/contests";

const emptyForm = {
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  registration_deadline: "",
};

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminContestsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [contests, setContests] = useState<Contest[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState<ContestStatus>("DRAFT");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadContests = useCallback(async () => {
    try {
      setError("");
      const data = await getContests();
      setContests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load contests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    } else if (!authLoading && user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === "ADMIN") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadContests();
    }
  }, [authLoading, isAuthenticated, user, loadContests]);

  function resetForm() {
    setForm(emptyForm);
    setStatus("DRAFT");
    setEditingId(null);
  }

  function handleEdit(contest: Contest) {
    setEditingId(contest.id);
    setForm({
      title: contest.title,
      description: contest.description,
      start_time: toLocalDateTime(contest.start_time),
      end_time: toLocalDateTime(contest.end_time),
      registration_deadline: toLocalDateTime(
        contest.registration_deadline
      ),
    });
    setStatus(contest.status);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const start = new Date(form.start_time).getTime();
    const end = new Date(form.end_time).getTime();
    const deadline = new Date(form.registration_deadline).getTime();

    if (deadline > start) {
      setError("Registration deadline must be before or at contest start time.");
      return;
    }

    if (end <= start) {
      setError("Contest end time must be after start time.");
      return;
    }

    const data: ContestData = {
      title: form.title,
      description: form.description,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      registration_deadline: new Date(
        form.registration_deadline
      ).toISOString(),
      status,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await updateContest(editingId, data);
        setSuccess("Contest updated successfully.");
      } else {
        await createContest(data);
        setSuccess("Contest created successfully.");
      }

      resetForm();
      await loadContests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save contest.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    contest: Contest,
    newStatus: ContestStatus
  ) {
    setError("");
    setSuccess("");

    try {
      await updateContest(contest.id, { status: newStatus });
      setSuccess("Contest status updated successfully.");
      await loadContests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    }
  }

  async function handleDelete(contest: Contest) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${contest.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteContest(contest.id);
      setSuccess("Contest deleted successfully.");
      await loadContests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete contest.");
    }
  }

  if (
    authLoading ||
    loading ||
    !isAuthenticated ||
    !user ||
    user.role !== "ADMIN"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading admin contest management...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Contest Management
            </h1>
            <p className="mt-2 text-slate-600">
              Create and manage programming contests.
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

        <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            {editingId !== null ? "Edit Contest" : "Create New Contest"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Contest Title
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Enter contest title"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
                placeholder="Describe the contest"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Registration Deadline
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.registration_deadline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      registration_deadline: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Contest Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Contest End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.end_time}
                  onChange={(e) =>
                    setForm({ ...form, end_time: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Contest Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ContestStatus)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Contest"
                    : "Create Contest"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel Editing
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            All Contests ({contests.length})
          </h2>

          {contests.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-slate-500">
              No contests have been created yet.
            </div>
          ) : (
            <div className="space-y-4">
              {contests.map((contest) => (
                <article
                  key={contest.id}
                  className="rounded-xl bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {contest.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {contest.description}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Starts: {new Date(contest.start_time).toLocaleString()}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      {contest.status}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => handleEdit(contest)}
                      className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <select
                      value={contest.status}
                      onChange={(e) =>
                        handleStatusChange(
                          contest,
                          e.target.value as ContestStatus
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label={`Change status for ${contest.title}`}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>

                    <button
                      onClick={() => handleDelete(contest)}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
