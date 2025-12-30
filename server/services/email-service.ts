import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendPasswordResetEmail(to: string, resetToken: string, username: string) {
  try {
    const { client, fromEmail } = await getResendClient();
    const appDomain = process.env.APP_DOMAIN || 'https://primetrack.pro';
    const resetLink = `${appDomain}/reset-password?token=${resetToken}`;
    
    const result = await client.emails.send({
      from: fromEmail || 'PrimeTrack <noreply@primetrack.pro>',
      to: [to],
      subject: 'Восстановление пароля - PrimeTrack',
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
              <h1>PrimeTrack</h1>
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
              <p>© ${new Date().getFullYear()} PrimeTrack. Все права защищены.</p>
              <p>Это автоматическое письмо, не отвечайте на него.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log('[email] Password reset email sent to:', to);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[email] Failed to send password reset email:', error);
    throw error;
  }
}

export const emailService = {
  sendPasswordResetEmail
};
