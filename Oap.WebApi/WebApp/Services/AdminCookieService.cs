using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Oap.WebApp.Models;

namespace Oap.WebApp.Services
{
    public class AdminCookieService
    {
        private readonly string _encryptionKey;

        public AdminCookieService(IConfiguration configuration)
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

        public string CreateToken(AdminTokenInfo info)
        {
            string json = JsonSerializer.Serialize(info);
            return Encrypt(json);
        }

        public AdminTokenInfo? ValidateToken(string token)
        {
            try
            {
                string json = Decrypt(token);
                var info = JsonSerializer.Deserialize<AdminTokenInfo>(json);
                if (info == null || info.ExpiresUtc < DateTime.UtcNow)
                    return null;

                info.ExpiresUtc = DateTime.UtcNow.AddDays(30);
                return info;
            }
            catch
            {
                return null;
            }
        }

        public void IssueAdminCookie(HttpResponse response, AdminTokenInfo info, bool isDevelopment)
        {
            var encryptedToken = CreateToken(info);

            response.Cookies.Append("admin_token", encryptedToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = !isDevelopment,
                SameSite = SameSiteMode.Lax,
                Expires = info.ExpiresUtc,
                Path = "/"
            });
        }

        public void ClearAdminCookie(HttpResponse response, bool isDevelopment)
        {
            response.Cookies.Delete("admin_token", new CookieOptions
            {
                HttpOnly = true,
                Secure = !isDevelopment,
                SameSite = SameSiteMode.Lax,
                Path = "/"
            });
        }
    }
}