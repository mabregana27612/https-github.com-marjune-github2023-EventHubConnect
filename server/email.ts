export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<{success: boolean, error?: string}> {
  // For development, return success with simulated email
  console.log('Email would be sent in production:');
  console.log('To:', params.to);
  console.log('Subject:', params.subject);
  console.log('Content:', params.text);

  return { 
    success: true,
    // Return simulated email content for testing
    error: 'Email sending simulated for development' 
  };
}

export function generatePasswordResetEmail(
  to: string,
  name: string,
  resetLink: string
): EmailParams {
  return {
    to,
    from: 'noreply@example.com',
    subject: 'Password Reset Request',
    text: `Hello ${name},\n\nYou requested to reset your password. Please use this link: ${resetLink}\n\nIf you didn't request this, please ignore this message.`,
    html: `
      <div>
        <h1>Password Reset</h1>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Please use this link:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn't request this, please ignore this message.</p>
      </div>
    `
  };
}