import { storage } from "../storage";

let schedulerStarted = false;

async function runScheduler() {
  try {
    const scheduledTasks = await storage.getScheduledTasks();
    for (const task of scheduledTasks) {
      await storage.updateTask(task.id, { isActive: true, scheduledPublishAt: null });
      console.log(`⏰ Scheduled task activated: "${task.title}" (id: ${task.id})`);
    }

    const scheduledVideos = await storage.getScheduledClassroomVideos();
    for (const video of scheduledVideos) {
      await storage.updateClassroomVideo(video.id, { isPublished: true, scheduledPublishAt: null });
      console.log(`⏰ Scheduled classroom video published: "${video.title}" (id: ${video.id})`);
    }
  } catch (error) {
    console.error("Content scheduler error:", error);
  }
}

export function initializeContentScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  runScheduler();
  setInterval(runScheduler, 5 * 60 * 1000);
  console.log("⏰ Content scheduler initialized (5-minute polling interval)");
}
