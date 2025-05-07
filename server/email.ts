import { MailService } from '@sendgrid/mail';

// Check if the SendGrid API key is available and valid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
console.log("SendGrid API key available:", SENDGRID_API_KEY ? "Yes" : "No");
console.log("SendGrid API key format valid:", SENDGRID_API_KEY && SENDGRID_API_KEY.startsWith('SG.') ? "Yes" : "No");

if (!SENDGRID_API_KEY) {
  console.error("SENDGRID_API_KEY environment variable is not set");
} else if (!SENDGRID_API_KEY.startsWith('SG.')) {
  console.error("API key does not start with \"SG.\"");
} else {
  console.log("SendGrid API key validation passed");
}

// Init with the available API key - we'll handle errors if it's not valid
const mailService = new MailService();
mailService.setApiKey(SENDGRID_API_KEY);

export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<{success: boolean, error?: string}> {
  // Check if SendGrid API key is available and valid
  if (!SENDGRID_API_KEY) {
    console.error('No SendGrid API key found. Email not sent.');
    return { success: false, error: 'SendGrid API key not configured' };
  }
  
  if (!SENDGRID_API_KEY.startsWith('SG.')) {
    console.error('Invalid SendGrid API key format. Email not sent.');
    return { success: false, error: 'Invalid SendGrid API key format' };
  }

  try {
    const msg = {
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || ''
    };

    await mailService.send(msg as any);
    console.log(`Email sent to ${params.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    
    // Extract more detailed error information
    let errorMessage = 'Failed to send email';
    
    if (error.response && error.response.body && error.response.body.errors) {
      const errors = error.response.body.errors;
      if (errors.length > 0) {
        errorMessage = `SendGrid error: ${errors[0].message || 'Unknown error'}`;
        console.error('Detailed SendGrid error:', errors);
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export function generatePasswordResetEmail(
  to: string,
  name: string,
  resetLink: string
): EmailParams {
  // Use a verified sender email for SendGrid
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@eventpro.com';
  
  return {
    to,
    from: fromEmail,
    subject: 'EventPro - Password Reset Request',
    text: `Hello ${name},\n\nYou requested to reset your password. Please click the following link to reset your password: ${resetLink}\n\nIf you didn't request a password reset, you can safely ignore this email.\n\nThis link will expire in 1 hour for security reasons.\n\n© ${new Date().getFullYear()} EventPro. All rights reserved.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5;">EventPro</h1>
        </div>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. To complete the process, please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} EventPro. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    `
  };
}