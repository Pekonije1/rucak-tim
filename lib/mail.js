import nodemailer from 'nodemailer';

export function mailConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

let transport;
export function getTransport() {
  transport ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
  });
  return transport;
}

export async function sendMail({ to, subject, html, text }) {
  return getTransport().sendMail({ from: `"Ručak 🍽️" <${process.env.GMAIL_USER}>`, to, subject, html, text });
}
