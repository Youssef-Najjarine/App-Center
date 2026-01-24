using System.Security.Cryptography;
using System.Text;

namespace WebApp.Utilities
{
    public static class CryptoUtils
    {
        public static string Sha256Hex(string input)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes);
        }
    }
}
