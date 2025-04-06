const nodemailer = require("nodemailer");
const config = require("config.json");

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = config.emailFrom }) {
  try {
    console.log('Attempting to send email with config:', {
      host: config.smtpOptions.host,
      port: config.smtpOptions.port,
      auth: {
        user: config.smtpOptions.auth.user
      }
    });
    const transporter = nodemailer.createTransport(config.smtpOptions);
    const result = await transporter.sendMail({ from, to, subject, html });
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
