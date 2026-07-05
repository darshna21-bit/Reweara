const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendOtpEmail = async (email, otp) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      const transportConfig = host.includes('gmail') ? {
        service: 'gmail',
        auth: {
          user,
          pass
        }
      } : {
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: {
          user,
          pass
        },
        tls: {
          rejectUnauthorized: false
        }
      };

      const transporter = nodemailer.createTransport(transportConfig);

      await transporter.sendMail({
        from: `"ReWeara Support" <${user}>`,
        to: email,
        subject: 'ReWeara Signup - OTP Verification Code',
        text: `Your signup OTP is: ${otp}. It will expire in 5 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px;">
            <h2 style="color: #4A3B32;">ReWeara Luxury Wardrobe</h2>
            <p>Hello,</p>
            <p>Thank you for starting your curation with ReWeara. Please use the following One-Time Password (OTP) to verify your email address and continue registration:</p>
            <div style="font-size: 24px; font-weight: bold; background-color: #F8F6F4; padding: 15px; text-align: center; border-radius: 4px; letter-spacing: 4px; color: #4A3B32; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 12px;">This OTP code is valid for 5 minutes and can be attempted up to 5 times. If you did not request this, please ignore this email.</p>
          </div>
        `
      });

      logger.success(`✉️ OTP email sent successfully to ${email}.`);
    } catch (err) {
      logger.error(`❌ Failed to send OTP email to ${email}:`, err);
      // Proceed gracefully (we don't want to throw an unhandled exception that crashes the signup flow)
    }
  } else {
    // Development mock logging
    logger.success('\n=============================================');
    logger.success(`✉️ [MOCK MAILER] OTP Verification for ${email}`);
    logger.success(`👉 OTP Code: ${otp}`);
    logger.success('=============================================\n');
  }
};

module.exports = { sendOtpEmail };
