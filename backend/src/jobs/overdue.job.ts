
import cron from "node-cron";
import prisma from "../lib/prisma";

export function startOverdueJob() {
  // Runs every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();

      const result = await prisma.task.updateMany({
        where: {
          dueDate: {
            lt: now,
          },
          isOverdue: false,
          status: {
            not: "DONE",
          },
        },
        data: {
          isOverdue: true,
        },
      });

      if (result.count > 0) {
        console.log(
          `Overdue job: marked ${result.count} task(s) as overdue`
        );
      }
    } catch (error) {
      console.error("Overdue job failed:", error);
    }
  });

  console.log("Overdue task background job started");
}

