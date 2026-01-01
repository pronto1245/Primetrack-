import { Resend } from 'resend';
import { storage } from '../storage';

async function getPlatformName(): Promise<string> {
  try {
    const settings = await storage.getPlatformSettings();
    return settings?.platformName || 'PrimeTrack';
  } catch {
    return 'PrimeTrack';
  }
}

// Use RESEND_API_KEY from environment secrets
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  console.log('[email] Resend client initialized with API key from secrets');
  return {
    client: new Resend(apiKey),
    // Use Resend's test sender for development
    fromEmail: 'Platform <onboarding@resend.dev>'
  };
}

export async function sendPasswordResetEmail(to: string, resetToken: string, username: string) {
  try {
    const { client, fromEmail } = getResendClient();
    const appDomain = process.env.APP_DOMAIN || 'https://primetrack.pro';
    const resetLink = `${appDomain}/reset-password?token=${resetToken}`;
    
    console.log('[email] Sending from:', fromEmail, 'to:', to);
    
    const platformName = await getPlatformName();
    
    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Восстановление пароля - ${platformName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${platformName}</h1>
              <p>Восстановление пароля</p>
            </div>
            <div class="content">
              <p>Здравствуйте, <strong>${username}</strong>!</p>
              <p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
              <p>Для создания нового пароля нажмите на кнопку ниже:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Сбросить пароль</a>
              </div>
              
              <div class="warning">
                <strong>Важно:</strong> Ссылка действительна в течение 1 часа. 
                Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
              </div>
              
              <p>Если кнопка не работает, скопируйте эту ссылку в браузер:</p>
              <p style="word-break: break-all; color: #10b981;">${resetLink}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${platformName}. Все права защищены.</p>
              <p>Это автоматическое письмо, не отвечайте на него.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log('[email] Password reset email sent to:', to, 'Response:', JSON.stringify(result));
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('[email] Failed to send password reset email:', error?.message || error);
    console.error('[email] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export const emailService = {
  sendPasswordResetEmail
};
