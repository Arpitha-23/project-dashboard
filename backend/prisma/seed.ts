import "dotenv/config";
import bcrypt from "bcrypt";
import { Role, TaskStatus, Priority } from "@prisma/client";
import prisma from "../src/lib/prisma";
async function main() {
  console.log("🌱 Starting database seed...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // -------------------------
  // USERS
  // -------------------------

  const admin = await prisma.user.upsert({
    where: { email: "admin@dashboard.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@dashboard.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.upsert({
    where: { email: "pm1@dashboard.com" },
    update: {},
    create: {
      name: "Ravi Kumar",
      email: "pm1@dashboard.com",
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.upsert({
    where: { email: "pm2@dashboard.com" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "pm2@dashboard.com",
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const developers = [];

  for (let i = 1; i <= 4; i++) {
    const developer = await prisma.user.upsert({
      where: {
        email: `developer${i}@dashboard.com`,
      },
      update: {},
      create: {
        name: `Developer ${i}`,
        email: `developer${i}@dashboard.com`,
        passwordHash,
        role: Role.DEVELOPER,
      },
    });

    developers.push(developer);
  }

  // -------------------------
  // CLIENTS
  // -------------------------

  const client1 = await prisma.client.upsert({
    where: { email: "client1@example.com" },
    update: {},
    create: {
      name: "Acme Technologies",
      email: "client1@example.com",
      company: "Acme Technologies",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { email: "client2@example.com" },
    update: {},
    create: {
      name: "Global Solutions",
      email: "client2@example.com",
      company: "Global Solutions",
    },
  });

  const client3 = await prisma.client.upsert({
    where: { email: "client3@example.com" },
    update: {},
    create: {
      name: "Nova Systems",
      email: "client3@example.com",
      company: "Nova Systems",
    },
  });

  // -------------------------
  // PROJECTS
  // -------------------------

  const project1 = await prisma.project.create({
    data: {
      name: "E-Commerce Platform",
      description: "Development of a modern e-commerce platform.",
      createdById: pm1.id,
      clientId: client1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Healthcare Management System",
      description: "Patient and appointment management platform.",
      createdById: pm1.id,
      clientId: client2.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Financial Analytics Dashboard",
      description: "Real-time financial analytics dashboard.",
      createdById: pm2.id,
      clientId: client3.id,
    },
  });

  // -------------------------
  // TASKS
  // -------------------------

  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);

  const fiveDaysLater = new Date(now);
  fiveDaysLater.setDate(now.getDate() + 5);

  const tasks = [
    {
      title: "Design product catalog",
      description: "Create the product catalog UI.",
      projectId: project1.id,
      developerId: developers[0].id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: tomorrow,
    },
    {
      title: "Implement authentication",
      description: "Implement secure login and registration.",
      projectId: project1.id,
      developerId: developers[1].id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.CRITICAL,
      dueDate: threeDaysLater,
    },
    {
      title: "Build shopping cart",
      description: "Implement shopping cart functionality.",
      projectId: project1.id,
      developerId: developers[2].id,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: fiveDaysLater,
    },
    {
      title: "Payment integration",
      description: "Integrate payment processing.",
      projectId: project1.id,
      developerId: developers[3].id,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: fiveDaysLater,
    },
    {
      title: "Order management",
      description: "Create order management APIs.",
      projectId: project1.id,
      developerId: developers[0].id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: yesterday,
    },

    {
      title: "Patient registration",
      description: "Create patient registration module.",
      projectId: project2.id,
      developerId: developers[1].id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: tomorrow,
    },
    {
      title: "Appointment scheduling",
      description: "Implement appointment scheduling.",
      projectId: project2.id,
      developerId: developers[2].id,
      status: TaskStatus.TODO,
      priority: Priority.CRITICAL,
      dueDate: threeDaysLater,
    },
    {
      title: "Doctor dashboard",
      description: "Build dashboard for doctors.",
      projectId: project2.id,
      developerId: developers[3].id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: tomorrow,
    },
    {
      title: "Medical records",
      description: "Implement medical records module.",
      projectId: project2.id,
      developerId: developers[0].id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: twoDaysAgo,
    },
    {
      title: "Notification system",
      description: "Create appointment notifications.",
      projectId: project2.id,
      developerId: developers[1].id,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: fiveDaysLater,
    },

    {
      title: "Revenue analytics",
      description: "Build revenue analytics module.",
      projectId: project3.id,
      developerId: developers[2].id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: tomorrow,
    },
    {
      title: "Financial charts",
      description: "Create interactive financial charts.",
      projectId: project3.id,
      developerId: developers[3].id,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: threeDaysLater,
    },
    {
      title: "Transaction reports",
      description: "Generate transaction reports.",
      projectId: project3.id,
      developerId: developers[0].id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.MEDIUM,
      dueDate: fiveDaysLater,
    },
    {
      title: "Export reports",
      description: "Allow users to export reports.",
      projectId: project3.id,
      developerId: developers[1].id,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: fiveDaysLater,
    },
    {
      title: "Analytics API",
      description: "Create analytics backend APIs.",
      projectId: project3.id,
      developerId: developers[2].id,
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      dueDate: twoDaysAgo,
    },
  ];

  const createdTasks = [];

  for (const task of tasks) {
    const createdTask = await prisma.task.create({
      data: {
        ...task,
        isOverdue:
          task.dueDate < now && task.status !== TaskStatus.DONE,
      },
    });

    createdTasks.push(createdTask);
  }

  // -------------------------
  // ACTIVITY LOGS
  // -------------------------

  await prisma.activity.createMany({
    data: [
      {
        message: "Ravi Kumar created project E-Commerce Platform",
        projectId: project1.id,
        userId: pm1.id,
      },
      {
        message: "Ravi Kumar moved Task #1 from To Do → In Progress",
        projectId: project1.id,
        taskId: createdTasks[0].id,
        userId: pm1.id,
      },
      {
        message: "Ravi Kumar moved Task #2 from In Progress → In Review",
        projectId: project1.id,
        taskId: createdTasks[1].id,
        userId: pm1.id,
      },
      {
        message: "Priya Sharma created project Financial Analytics Dashboard",
        projectId: project3.id,
        userId: pm2.id,
      },
      {
        message: "Developer 3 completed Analytics API",
        projectId: project3.id,
        taskId: createdTasks[14].id,
        userId: developers[2].id,
      },
    ],
  });

  // -------------------------
  // NOTIFICATIONS
  // -------------------------

  await prisma.notification.createMany({
    data: [
      {
        message: "You have been assigned a new task: Design product catalog",
        userId: developers[0].id,
      },
      {
        message: "You have been assigned a new task: Implement authentication",
        userId: developers[1].id,
      },
      {
        message: "Task Implement authentication is ready for your review.",
        userId: pm1.id,
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log("Users: 7");
  console.log("Clients: 3");
  console.log("Projects: 3");
  console.log("Tasks: 15");
  console.log("Activities: 5");
  console.log("Notifications: 3");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });