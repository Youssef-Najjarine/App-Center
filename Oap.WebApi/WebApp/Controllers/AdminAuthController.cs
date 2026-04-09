using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;
using System.Data;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminAuthController : ControllerBase
    {
        private readonly AdminCookieService _adminCookieService;
        private readonly IWebHostEnvironment _environment;
        private readonly string _connectionString;

        public AdminAuthController(
            AdminCookieService adminCookieService,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _adminCookieService = adminCookieService;
            _environment = environment;
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        [HttpPost("sign-in")]
        public async Task<IActionResult> SignIn([FromBody] AdminSignInRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Username and password are required." });

            try
            {
                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                const string sql = @"
SELECT Id, Username, PasswordHash, DisplayName
FROM dbo.AdminAccount
WHERE Username = @Username;";

                Guid adminId;
                string username;
                string passwordHash;
                string displayName;

                await using (var cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = request.Username.Trim();
                    await using var reader = await cmd.ExecuteReaderAsync();
                    if (!await reader.ReadAsync())
                        return Unauthorized(new { error = "Invalid credentials." });

                    adminId = reader.GetGuid(0);
                    username = reader.GetString(1);
                    passwordHash = reader.GetString(2);
                    displayName = reader.IsDBNull(3) ? "" : reader.GetString(3);
                }

                if (!PasswordHasher.VerifyPassword(request.Password, passwordHash))
                    return Unauthorized(new { error = "Invalid credentials." });

                var tokenInfo = new AdminTokenInfo
                {
                    AdminId = adminId,
                    Username = username,
                    DisplayName = displayName,
                    ExpiresUtc = DateTime.UtcNow.AddDays(30),
                };

                _adminCookieService.IssueAdminCookie(Response, tokenInfo, _environment.IsDevelopment());

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error during sign in." });
            }
        }

        [HttpGet("me")]
        public IActionResult Me()
        {
            var admin = GetAuthedAdmin();
            if (admin == null) return Unauthorized(new { error = "Not authenticated." });

            return Ok(new
            {
                success = true,
                admin = new
                {
                    adminId = admin.AdminId,
                    username = admin.Username,
                    displayName = admin.DisplayName,
                }
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            _adminCookieService.ClearAdminCookie(Response, _environment.IsDevelopment());
            return Ok(new { success = true });
        }

        private AdminTokenInfo? GetAuthedAdmin()
        {
            var token = Request.Cookies["admin_token"];
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var info = _adminCookieService.ValidateToken(token);
                if (info == null || info.ExpiresUtc <= DateTime.UtcNow) return null;
                return info;
            }
            catch { return null; }
        }
    }

    public class AdminSignInRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }
}