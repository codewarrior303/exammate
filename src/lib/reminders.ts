import { getAuthDatabase } from "./auth";
import { ObjectId } from "mongodb";

export interface ExamReminderRecord {
  _id?: ObjectId;
  userEmail: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  faculty?: string;
  examDate: string;
  startTime: string;
  endTime: string;
  examStartUtc: Date;
  examDateFormatted: string;
  examTimeFormatted: string;
  reminderSent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

const COLLECTION_NAME = "exam_reminders";

export async function saveExamReminders(reminders: Omit<ExamReminderRecord, "_id" | "createdAt" | "reminderSent">[]): Promise<number> {
  if (!reminders.length) return 0;

  try {
    const db = await getAuthDatabase();
    const collection = db.collection<ExamReminderRecord>(COLLECTION_NAME);

    // Create unique compound index on first run if not already present
    await collection.createIndex(
      { userEmail: 1, courseCode: 1, examDate: 1, startTime: 1 },
      { unique: true, background: true }
    );

    let saved = 0;
    const now = new Date();

    for (const item of reminders) {
      const filter = {
        userEmail: item.userEmail.toLowerCase().trim(),
        courseCode: item.courseCode.trim(),
        examDate: item.examDate,
        startTime: item.startTime,
      };

      // Don't overwrite if reminder was already sent
      const existing = await collection.findOne(filter);
      if (existing) {
        // If already exists and not sent, update details just in case course title or faculty changed
        if (!existing.reminderSent) {
          await collection.updateOne(filter, {
            $set: {
              studentName: item.studentName,
              courseTitle: item.courseTitle,
              faculty: item.faculty,
              endTime: item.endTime,
              examStartUtc: item.examStartUtc,
              examDateFormatted: item.examDateFormatted,
              examTimeFormatted: item.examTimeFormatted,
            },
          });
        }
        saved += 1;
        continue;
      }

      await collection.insertOne({
        ...item,
        userEmail: item.userEmail.toLowerCase().trim(),
        courseCode: item.courseCode.trim(),
        reminderSent: false,
        createdAt: now,
      });
      saved += 1;
    }

    return saved;
  } catch (error) {
    console.error("Failed to save exam reminders to database:", error);
    return 0;
  }
}

export async function getDueReminders(now: Date = new Date()): Promise<ExamReminderRecord[]> {
  try {
    const db = await getAuthDatabase();
    const collection = db.collection<ExamReminderRecord>(COLLECTION_NAME);

    // 24 hours from now plus a 1-hour grace window so hourly cron catches all upcoming exams
    const reminderWindowStart = now;
    const reminderWindowEnd = new Date(now.getTime() + (24 * 60 + 60) * 60 * 1000);

    return await collection.find({
      reminderSent: false,
      examStartUtc: {
        $gt: reminderWindowStart,
        $lte: reminderWindowEnd,
      },
    }).limit(100).toArray();
  } catch (error) {
    console.error("Failed to fetch due reminders from database:", error);
    return [];
  }
}

export async function markReminderSent(id: ObjectId): Promise<boolean> {
  try {
    const db = await getAuthDatabase();
    const collection = db.collection<ExamReminderRecord>(COLLECTION_NAME);

    const result = await collection.updateOne(
      { _id: id },
      { $set: { reminderSent: true, sentAt: new Date() } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error(`Failed to mark reminder ${id.toString()} as sent:`, error);
    return false;
  }
}
