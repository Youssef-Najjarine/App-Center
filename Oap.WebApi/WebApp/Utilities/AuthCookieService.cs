using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Oap.WebApp.Utilities
{
    public class UserTokenInfo
    {
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public DateTime ExpiresUtc { get; set; }
    }

    public class AuthCookieService
    {
        private readonly string _encryptionKey;

        public AuthCookieService(IConfiguration configuration)
        {
            _encryptionKey = configuration["AuthSettings:EncryptionKey"]!;
        }

        private string Encrypt(string plainText)
        {
            byte[] key = Convert.FromBase64String(_encryptionKey);
            using Aes aes = Aes.Create();
            aes.Key = key;
            aes.GenerateIV();
            using ICryptoTransform encryptor = aes.CreateEncryptor();
            byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] encrypted = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            byte[] result = aes.IV.Concat(encrypted).ToArray();
            return Convert.ToBase64String(result);
        }

        private string Decrypt(string cipherText)
        {
            byte[] key = Convert.FromBase64String(_encryptionKey);
            byte[] fullCipher = Convert.FromBase64String(cipherText);
            byte[] iv = fullCipher.Take(16).ToArray();
            byte[] cipher = fullCipher.Skip(16).ToArray();
            using Aes aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            using ICryptoTransform decryptor = aes.CreateDecryptor();
            byte[] decrypted = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
            return Encoding.UTF8.GetString(decrypted);
        }

        public string CreateToken(UserTokenInfo info)
        {
            string json = JsonSerializer.Serialize(info);
            return Encrypt(json);
        }

        public UserTokenInfo? ValidateToken(string token)
        {
            try
            {
                string json = Decrypt(token);
                var info = JsonSerializer.Deserialize<UserTokenInfo>(json);
                if (info == null || info.ExpiresUtc < DateTime.UtcNow)
                {
                    return null;
                }

                info.ExpiresUtc = DateTime.UtcNow.AddDays(30);
                return info;
            }
            catch
            {
                return null;
            }
        }
        public string GetOrCreateDeviceId(HttpContext context, IWebHostEnvironment env)
        {
            if (context.Request.Cookies.TryGetValue("device_id", out var deviceId) &&
                !string.IsNullOrWhiteSpace(deviceId))
            {
                return deviceId;
            }

            deviceId = Guid.NewGuid().ToString("N");

            context.Response.Cookies.Append("device_id", deviceId, new CookieOptions
            {
                HttpOnly = true,
                Secure = !env.IsDevelopment(),
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddYears(1)
            });

            return deviceId;
        }
    }
}