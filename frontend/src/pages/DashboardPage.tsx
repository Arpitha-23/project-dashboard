import NotificationBell from "../components/NotificationBell";
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { getSocket } from "../socket";

interface DashboardData {
  role: string;
  totalProjects?: number;
  totalTasks?: number;
  overdueCount?: number;
  taskStatusCounts?: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  priorityCounts?: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  statusCounts?: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  projects?: {
    id: number;
    name: string;
    taskCount: number;
  }[];
  tasks?: {
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    isOverdue: boolean;
    project: {
      id: number;
      name: string;
    };
  }[];
}

interface Activity {
  id: number;
  message: string;
  createdAt: string;
  projectId: number;
  taskId?: number;
  userId: number;
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number | string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function formatStatus(status: string) {
  switch (status) {
    case "TODO":
      return "To Do";

    case "IN_PROGRESS":
      return "In Progress";

    case "IN_REVIEW":
      return "In Review";

    case "DONE":
      return "Done";

    default:
      return status;
  }
}

function formatPriority(priority: string) {
  switch (priority) {
    case "LOW":
      return "Low";

    case "MEDIUM":
      return "Medium";

    case "HIGH":
      return "High";

    case "CRITICAL":
      return "Critical";

    default:
      return priority;
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";

    case "HIGH":
      return "bg-orange-100 text-orange-700";

    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700";

    case "LOW":
      return "bg-green-100 text-green-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "DONE":
      return "bg-green-100 text-green-700";

    case "IN_REVIEW":
      return "bg-purple-100 text-purple-700";

    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";

    case "TODO":
      return "bg-slate-100 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function DashboardPage() {
  const { user, accessToken, logout } = useAuth();

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
  const socket = getSocket();

  if (!socket || user?.role !== "ADMIN") {
    return;
  }

  function handleOnlineUsersCount(count: number) {
    setOnlineUsers(count);
  }

  socket.on(
    "online-users:count",
    handleOnlineUsersCount
  );

  return () => {
    socket.off(
      "online-users:count",
      handleOnlineUsersCount
    );
  };
}, [user?.role]);

  useEffect(() => {
    async function loadDashboard() {
      if (!accessToken) return;

      try {
        setLoading(true);
        setError("");

        const response = await api.get("/dashboard/summary", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        setDashboard(response.data.dashboard);
      } catch (err: any) {
        console.error(err);

        setError(
          err?.response?.data?.message ||
            "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [accessToken]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      console.warn("Socket is not connected");
      return;
    }

    function handleNewActivity(activity: Activity) {
      console.log("New activity received:", activity);

      setActivities((current) => {
        const alreadyExists = current.some(
          (item) => item.id === activity.id
        );

        if (alreadyExists) {
          return current;
        }

        return [activity, ...current].slice(0, 20);
      });
    }

    socket.on("activity:new", handleNewActivity);

    return () => {
      socket.off("activity:new", handleNewActivity);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>

          <p className="mt-4 text-slate-600">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-red-200 text-center">
          <h2 className="text-xl font-bold text-red-600">
            Something went wrong
          </h2>

          <p className="mt-2 text-slate-600">
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Project Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Welcome back, {user?.name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name}
              </p>

              <p className="text-xs text-slate-500">
                {user?.role}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* ADMIN DASHBOARD */}
        {dashboard?.role === "ADMIN" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Admin Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Global project and task statistics
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Projects"
                value={dashboard.totalProjects ?? 0}
                description="All projects in the system"
              />

              <StatCard
                title="Total Tasks"
                value={dashboard.totalTasks ?? 0}
                description="All tasks"
              />

              <StatCard
                title="Overdue Tasks"
                value={dashboard.overdueCount ?? 0}
                description="Tasks requiring attention"
              />
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">
        Online Users
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {onlineUsers}
      </p>

      <p className="mt-1 text-xs text-green-600">
        Live via WebSocket
      </p>
    </div>

    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-600">
      ●
    </div>
  </div>
</div>

              <StatCard
                title="System Status"
                value="Online"
                description="All services operational"
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Task Status
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    To Do
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.taskStatusCounts?.TODO ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-600">
                    In Progress
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.taskStatusCounts?.IN_PROGRESS ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-purple-50 p-4">
                  <p className="text-sm text-purple-600">
                    In Review
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.taskStatusCounts?.IN_REVIEW ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm text-green-600">
                    Done
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.taskStatusCounts?.DONE ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PROJECT MANAGER DASHBOARD */}
        {dashboard?.role === "PROJECT_MANAGER" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Project Manager Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your projects and monitor your team's work
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="My Projects"
                value={dashboard.totalProjects ?? 0}
              />

              <StatCard
                title="My Tasks"
                value={dashboard.totalTasks ?? 0}
              />

              <StatCard
                title="Overdue"
                value={dashboard.overdueCount ?? 0}
              />

              <StatCard
                title="Critical Tasks"
                value={dashboard.priorityCounts?.CRITICAL ?? 0}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Tasks by Priority
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["LOW", "Low"],
                  ["MEDIUM", "Medium"],
                  ["HIGH", "High"],
                  ["CRITICAL", "Critical"],
                ].map(([key, label]) => (
                  <div
                    key={key}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <p className="text-sm text-slate-500">
                      {label}
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {dashboard.priorityCounts?.[
                        key as keyof NonNullable<
                          DashboardData["priorityCounts"]
                        >
                      ] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                My Projects
              </h3>

              {dashboard.projects &&
              dashboard.projects.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {dashboard.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {project.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          Project #{project.id}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {project.taskCount} tasks
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No projects found.
                </p>
              )}
            </div>
          </>
        )}

        {/* DEVELOPER DASHBOARD */}
        {dashboard?.role === "DEVELOPER" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Developer Dashboard
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your assigned tasks and current workload
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Assigned Tasks"
                value={dashboard.totalTasks ?? 0}
              />

              <StatCard
                title="Overdue"
                value={dashboard.overdueCount ?? 0}
              />

              <StatCard
                title="In Review"
                value={dashboard.statusCounts?.IN_REVIEW ?? 0}
              />

              <StatCard
                title="Completed"
                value={dashboard.statusCounts?.DONE ?? 0}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Task Status
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    To Do
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.statusCounts?.TODO ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-600">
                    In Progress
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.statusCounts?.IN_PROGRESS ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-purple-50 p-4">
                  <p className="text-sm text-purple-600">
                    In Review
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.statusCounts?.IN_REVIEW ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm text-green-600">
                    Done
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {dashboard.statusCounts?.DONE ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                My Assigned Tasks
              </h3>

              {dashboard.tasks &&
              dashboard.tasks.length > 0 ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">
                          Task
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">
                          Project
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">
                          Priority
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">
                          Status
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">
                          Due Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {dashboard.tasks.map((task) => (
                        <tr
                          key={task.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-3 py-4">
                            <p className="font-medium text-slate-800">
                              {task.title}
                            </p>

                            <p className="text-xs text-slate-400">
                              Task #{task.id}
                            </p>
                          </td>

                          <td className="px-3 py-4 text-sm text-slate-600">
                            {task.project.name}
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                                task.priority
                              )}`}
                            >
                              {formatPriority(task.priority)}
                            </span>
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                task.status
                              )}`}
                            >
                              {formatStatus(task.status)}
                            </span>
                          </td>

                          <td className="px-3 py-4">
                            <p
                              className={`text-sm ${
                                task.isOverdue
                                  ? "font-semibold text-red-600"
                                  : "text-slate-600"
                              }`}
                            >
                              {new Date(
                                task.dueDate
                              ).toLocaleDateString()}
                            </p>

                            {task.isOverdue && (
                              <p className="text-xs text-red-500">
                                Overdue
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No assigned tasks.
                </p>
              )}
            </div>
          </>
        )}

        {/* LIVE ACTIVITY */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Live Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Real-time project activity
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
              Live
            </div>
          </div>

          <div className="mt-5">
            {activities.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-5 text-center">
                <p className="text-sm text-slate-500">
                  Waiting for new activity...
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Task status changes will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        ↻
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {activity.message}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(
                            activity.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

