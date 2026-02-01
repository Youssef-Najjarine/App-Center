using MailKit.Net.Smtp;
using MimeKit;

namespace Oap.WebApp.Utilities
{
    public class EmailService
    {
        private readonly string _host;
        private readonly int _port;
        private readonly string _username;
        private readonly string _password;
        private readonly string _fromEmail;
        private readonly string _fromName;

        public EmailService(IConfiguration configuration)
        {
            var smtp = configuration.GetSection("SmtpSettings");
            _host = smtp["Host"]!;
            _port = int.Parse(smtp["Port"]!);
            _username = smtp["Username"]!;
            _password = smtp["Password"]!;
            _fromEmail = smtp["FromEmail"]!;
            _fromName = smtp["FromName"]!;
        }

        public async Task SendVerificationCodeAsync(string toEmail, string code)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_fromName, _fromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = "Your Verification Code";

            message.Body = new TextPart("plain")
            {
                Text = $"Your verification code is: {code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, ignore this email."
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(_host, _port, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_username, _password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}