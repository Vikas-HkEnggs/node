import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();
import { notifyJobWorkWhenCommitmentDateNear } from "../controller/Employee/jobWorkController.js";

// Schedule the notification job to run every minute (for testing)
cron.schedule("0 0 * * *", async () => {
    console.log("Running job to check near commitment dates...");
    await notifyJobWorkWhenCommitmentDateNear();
});