import nodemailer from "nodemailer";
import ejs from "ejs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ApiError } from "./ApiError.js";

dotenv.config();

// Manually define __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sendMail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { email, subject, template, data } = options;

  if (!template || !data) {
    throw new Error("Template name or data is missing");
  }

  const templatePath = path.join(__dirname, "../mails", template);



  try {
    // Render the email template with EJS
    const html = await ejs.renderFile(templatePath, data);

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject,
      html,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

  } catch (error) {
    throw new ApiError(500, "Failed to send email");
  }
};

export default sendMail;