const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {

  const { data, error } = await resend.emails.send({
    from: "Danmus SMS <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.log("Email error:", error);
    throw new Error(error.message);
  }

  console.log("Email sent:", data);
};

module.exports = sendEmail;