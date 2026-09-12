import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { getSocket } from "../socket";

interface Developer {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate: string;
  isOverdue: boolean;
  developer: Developer;
  project: {
    id: number;
    name: string;
    createdById: number;
  };
}

interface Activity {
  id: number;
  message: string;
  createdAt: string;
  projectId: number;
  taskId?: number;
  userId: number;
}

const statuses = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

const priorities = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function statusClass(status: string) {
  switch (status) {
    case "DONE":
      return "bg-green-100 text-green-700";
    case "IN_REVIEW":
      return "bg-purple-100 text-purple-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
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
    default:
      return "bg-green-100 text-green-700";
  }
}


function formatPriority(priority: string) {
  return (
    priorities.find((item) => item.value === priority)?.label ?? priority
  );
}

function formatActivityTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const difference = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  );

  if (difference < 10) return "Just now";
  if (difference < 60) return `${difference} seconds ago`;

  const minutes = Math.floor(difference / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  return date.toLocaleString();
}

export default function TasksPage() {
  const { user, accessToken } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [developerId, setDeveloperId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");

  const canCreate =
    user?.role === "ADMIN" ||
    user?.role === "PROJECT_MANAGER";

  /*
   * Load tasks from backend.
   */
  async function loadTasks() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (priorityFilter) {
        params.priority = priorityFilter;
      }
      if (dueDateFrom) {
  params.dueDateFrom = dueDateFrom;
}

if (dueDateTo) {
  params.dueDateTo = dueDateTo;
}

      const response = await api.get("/tasks", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      });

      setTasks(response.data.tasks || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load tasks"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Load the latest 20 activities from PostgreSQL.
   *
   * This function is outside useEffect so it can also
   * be called whenever Socket.IO reconnects.
   */
  async function loadRecentActivities() {
    if (!accessToken) return;

    try {
      const response = await api.get(
        "/tasks/activities/recent",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setActivities(
        response.data.activities || []
      );
    } catch (err) {
      console.error(
        "Failed to load recent activities:",
        err
      );
    }
  }

  /*
   * Load projects and developers for
   * Admin and Project Manager.
   */
  async function loadFormData() {
    if (!accessToken) return;

    try {
      if (
        user?.role === "ADMIN" ||
        user?.role === "PROJECT_MANAGER"
      ) {
        const [
          projectResponse,
          developerResponse,
        ] = await Promise.all([
          api.get("/projects", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),

          api.get("/users/developers", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
        ]);

        setProjects(
          projectResponse.data.projects || []
        );

        setDevelopers(
          developerResponse.data.users || []
        );
      }
    } catch (err) {
      console.error(
        "Failed to load form data:",
        err
      );
    }
  }

  /*
   * Load tasks whenever authentication or
   * filters change.
   */
  useEffect(() => {
  loadTasks();
}, [
  accessToken,
  statusFilter,
  priorityFilter,
  dueDateFrom,
  dueDateTo,
]);
  /*
   * Load recent activities when the page
   * initially loads.
   */
  useEffect(() => {
    loadRecentActivities();
  }, [accessToken]);

  /*
   * Load projects and developers.
   */
  useEffect(() => {
    loadFormData();
  }, [
    accessToken,
    user?.role,
  ]);

  /*
   * Socket.IO live activity listener.
   *
   * Also reloads the latest activities from
   * PostgreSQL whenever Socket.IO reconnects.
   */
  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();

    if (!socket) {
      console.warn(
        "Socket is not connected yet."
      );
      return;
    }

    /*
     * New activity received in real time.
     */
    function handleNewActivity(
      activity: Activity
    ) {
      console.log(
        "Live activity received:",
        activity
      );

      setActivities((current) => {
        /*
         * Prevent duplicate activities.
         */
        if (
          current.some(
            (item) => item.id === activity.id
          )
        ) {
          return current;
        }

        /*
         * Keep only the latest 20 activities.
         */
        return [
          activity,
          ...current,
        ].slice(0, 20);
      });

      /*
       * Refresh task list so viewers
       * immediately see the new status.
       */
      loadTasks();
    }

    /*
     * Socket.IO reconnect handler.
     *
     * If the user was offline and missed events,
     * fetch the latest 20 activities from the DB.
     */
    function handleReconnect() {
      console.log(
        "Socket reconnected. Loading recent activities..."
      );

      loadRecentActivities();
      loadTasks();
    }

    socket.on(
      "activity:new",
      handleNewActivity
    );

    socket.on(
      "connect",
      handleReconnect
    );

    return () => {
      socket.off(
        "activity:new",
        handleNewActivity
      );

      socket.off(
        "connect",
        handleReconnect
      );
    };
  }, [accessToken]);

  /*
   * Join the project rooms that this user
   * can currently see.
   */
  useEffect(() => {
    const socket = getSocket();

    if (!socket) return;

    /*
     * Admin and Project Manager:
     * join their visible project rooms.
     */
    if (projects.length > 0) {
      projects.forEach((project) => {
        socket.emit(
          "join-project",
          project.id
        );
      });
    }

    /*
     * Developer:
     * join project rooms belonging to
     * their assigned tasks.
     */
    if (tasks.length > 0) {
      const projectIds = Array.from(
        new Set(
          tasks.map(
            (task) => task.project.id
          )
        )
      );

      projectIds.forEach((id) => {
        socket.emit(
          "join-project",
          id
        );
      });
    }
  }, [projects, tasks]);

  /*
   * Create a new task.
   */
  async function createTask(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!accessToken) return;

    try {
      setError("");
      setSuccess("");

      await api.post(
        "/tasks",
        {
          title,
          description:
            description || undefined,
          projectId: Number(projectId),
          developerId: Number(developerId),
          priority,
          dueDate,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setSuccess(
        "Task created successfully."
      );

      setTitle("");
      setDescription("");
      setProjectId("");
      setDeveloperId("");
      setPriority("MEDIUM");
      setDueDate("");

      setShowCreate(false);

      await loadTasks();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to create task"
      );
    }
  }

  /*
   * Update task status.
   */
  async function updateStatus(
    taskId: number,
    newStatus: string
  ) {
    if (!accessToken) return;

    try {
      setError("");
      setSuccess("");

      await api.patch(
        `/tasks/${taskId}/status`,
        {
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      /*
       * The backend creates the activity
       * and emits activity:new through Socket.IO.
       */
      await loadTasks();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to update task status"
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Task Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage tasks, assignments and status
              updates
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() =>
                setShowCreate(!showCreate)
              }
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {showCreate
                ? "Close"
                : "+ Create Task"}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* CREATE TASK */}
        {showCreate && canCreate && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Create New Task
            </h2>

            <form
              onSubmit={createTask}
              className="mt-5 grid gap-5 md:grid-cols-2"
            >
              {/* TITLE */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Task Title
                </label>

                <input
                  required
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Enter task title"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                />
              </div>

              {/* PROJECT */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Project
                </label>

                <select
                  required
                  value={projectId}
                  onChange={(e) =>
                    setProjectId(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">
                    Select project
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DEVELOPER */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Assign Developer
                </label>

                <select
                  required
                  value={developerId}
                  onChange={(e) =>
                    setDeveloperId(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">
                    Select developer
                  </option>

                  {developers.map(
                    (developer) => (
                      <option
                        key={developer.id}
                        value={developer.id}
                      >
                        {developer.name} (
                        {developer.email})
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PRIORITY */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                >
                  {priorities.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* DUE DATE */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Due Date
                </label>

                <input
                  required
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <input
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              {/* BUTTON */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FILTERS */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* STATUS */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
              >
                <option value="">
                  All statuses
                </option>

                {statuses.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {/* DUE DATE FROM */}
<div>
  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
    Due From
  </label>

  <input
    type="date"
    value={dueDateFrom}
    onChange={(e) => setDueDateFrom(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
  />
</div>

{/* DUE DATE TO */}
<div>
  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
    Due To
  </label>

  <input
    type="date"
    value={dueDateTo}
    onChange={(e) => setDueDateTo(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
  />
</div>

            {/* PRIORITY */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Priority
              </label>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
              >
                <option value="">
                  All priorities
                </option>

                {priorities.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-sm text-slate-500">
              {tasks.length} task
              {tasks.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* LIVE ACTIVITY FEED */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Live Activity Feed
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Real-time task updates
                </p>
              </div>

              <span className="flex items-center gap-2 text-xs font-semibold text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-6">
                <p className="text-sm font-medium text-slate-600">
                  No new activity yet.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Task status changes will appear
                  here automatically.
                </p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border-b border-slate-100 p-5 last:border-0 hover:bg-slate-50"
                >
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm">
                      ⚡
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {activity.message}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatActivityTime(
                          activity.createdAt
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TASKS */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Tasks
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-slate-700">
                No tasks found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create a task or change your
                filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                      Task
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                      Project
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                      Developer
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                      Priority
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                      Due Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      {/* TASK */}
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-800">
                          {task.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Task #{task.id}
                        </p>
                      </td>

                      {/* PROJECT */}
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {task.project.name}
                      </td>

                      {/* DEVELOPER */}
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-slate-700">
                          {task.developer.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          {task.developer.email}
                        </p>
                      </td>

                      {/* PRIORITY */}
                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClass(
                            task.priority
                          )}`}
                        >
                          {formatPriority(
                            task.priority
                          )}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            updateStatus(
                              task.id,
                              e.target.value
                            )
                          }
                          className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ${statusClass(
                            task.status
                          )}`}
                        >
                          {statuses.map(
                            (item) => (
                              <option
                                key={
                                  item.value
                                }
                                value={
                                  item.value
                                }
                              >
                                {item.label}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      {/* DUE DATE */}
                      <td className="px-6 py-5">
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
                          <p className="mt-1 text-xs text-red-500">
                            Overdue
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}