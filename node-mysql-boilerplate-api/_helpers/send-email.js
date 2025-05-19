const nodemailer = require('nodemailer');
const config = require('config.json');

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = config.emailFrom }) {
    const transporter = nodemailer.createTransport(config.smtpOptions);

    const info = await transporter.sendMail({ from, to, subject, html });

    // Log ethereal preview URL (only in development)
    if (process.env.NODE_ENV !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Email sent (Ethereal): %s', previewUrl);
    }
}
