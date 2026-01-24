using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using WebApp.DTOs;
using WebApp.Interfaces;
using WebApp.Services;
using WebApp.Utilities;

namespace WebApp.Controllers
{
    [ApiController]
    [Route("api")]
    public class UserAccountController : ControllerBase
    {
        private readonly IUserAccount _userAccountService;
        private readonly IVerificationUserAccount _verificationService;
        private readonly AuthCookieService _authCookieService;
        private readonly IWebHostEnvironment _environment;
        private readonly TrustedDeviceService _trustedDeviceService;
        private readonly AuthCookieIssuerService _authCookieIssuerService;

        public UserAccountController(
            IUserAccount userAccountService,
            IVerificationUserAccount verificationService,
            AuthCookieService authCookieService,
            IWebHostEnvironment environment,
            TrustedDeviceService trustedDeviceService,
            AuthCookieIssuerService authCookieIssuerService)
        {
            _userAccountService = userAccountService;
            _verificationService = verificationService;
            _authCookieService = authCookieService;
            _environment = environment;
            _trustedDeviceService = trustedDeviceService;
            _authCookieIssuerService = authCookieIssuerService;
        }

        [HttpGet("user-account-details")]
        public async Task<IActionResult> UserAccountDetails()
        {
            try
            {
                // 1) Read auth cookie
                var token = Request.Cookies["auth_token"];
                if (string.IsNullOrWhiteSpace(token))
                    return Unauthorized(new { error = "Not authenticated" });

                // 2) Decrypt/validate token -> get userId
                UserTokenInfo? tokenInfo;
                try
                {
                    tokenInfo = _authCookieService.ValidateToken(token);
                }
                catch
                {
                    return Unauthorized(new { error = "Invalid auth token" });
                }

                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                    return Unauthorized(new { error = "Auth token expired" });

                // 3) Get user from DB (best by Id)
                var user = await _userAccountService.GetUserByIdAsync(tokenInfo.UserId);
                if (user == null)
                    return Unauthorized(new { error = "User not found" });

                return Ok(new
                {
                    success = true,
                    user = new
                    {
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        email = user.EmailAddress,
                        username = user.Username,
                        bio = user.BioText
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error while loading profile." });
            }
        }

        [HttpPost("sign-up")]
        public async Task<IActionResult> Signup([FromBody] SignupRequest request)
        {
            var validationErrors = SignUpValidator.Validate(request);
            if (validationErrors.Count > 0)
                return BadRequest(new { errors = validationErrors });

            try
            {
                string? errorMessage = await _userAccountService.CreateUserAsync(
                    request.Username.Trim(),
                    request.Password,
                    request.Email.Trim(),
                    request.FirstName.Trim(),
                    request.LastName.Trim());

                if (errorMessage == null)
                    return Ok(new { success = true });

                var field = errorMessage.Contains("Username", StringComparison.OrdinalIgnoreCase) ? "username" : "email";
                return BadRequest(new { errors = new Dictionary<string, string> { { field, errorMessage } } });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error during signup." });
            }
        }

        [HttpPost("sign-in")]
        public async Task<IActionResult> Signin([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailUsername) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Email/Username and password are required" });

            var user = await _userAccountService.GetUserByEmailOrUsernameAsync(request.EmailUsername.Trim());
            if (user == null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
            {
                // 401 is more correct than 400 for auth failure
                return Unauthorized(new { error = "Invalid credentials" });
            }

            // 1) If account itself isn't verified, always force verification first
            if (!user.IsVerified)
            {
                bool resendSuccess = await _verificationService.ResendCodeAsync(user.EmailAddress);
                if (!resendSuccess)
                    return StatusCode(500, new { error = "Unable to send verification code. Please try again later." });

                return Unauthorized(new
                {
                    requiresVerification = true,
                    email = user.EmailAddress,
                    reason = "AccountNotVerified"
                });
            }

            // 2) Device trust (new browser or older than 30 days => verify)
            var deviceId = _authCookieService.GetOrCreateDeviceId(HttpContext, _environment);

            var trusted = await _trustedDeviceService.IsDeviceTrustedAsync(user.Id, deviceId);
            if (!trusted)
            {
                await _verificationService.GenerateAndSendCodeAsync(user.Id, user.EmailAddress);

                return Unauthorized(new
                {
                    requiresVerification = true,
                    email = user.EmailAddress,
                    reason = "DeviceNotTrusted"
                });
            }

            // 3) Issue auth cookie
            _authCookieIssuerService.IssueAuthCookie(Response, user.Id, user.Username);

            return Ok(new { success = true });
        }

        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
                return BadRequest(new { error = "Email and code are required" });

            bool valid = await _verificationService.VerifyCodeAsync(request.Email.Trim(), request.Code.Trim());
            if (!valid)
                return BadRequest(new { error = "Invalid or expired code" });

            // Get user (now verified)
            var user = await _userAccountService.GetUserByEmailOrUsernameAsync(request.Email.Trim());
            if (user == null)
                return BadRequest(new { error = "User not found" });

            // Trust this device
            var deviceId = _authCookieService.GetOrCreateDeviceId(HttpContext, _environment);
            await _trustedDeviceService.UpsertTrustedDeviceAsync(user.Id, deviceId);

            // Issue auth cookie so they are actually logged in after verifying
            _authCookieIssuerService.IssueAuthCookie(Response, user.Id, user.Username);

            return Ok(new { success = true });
        }

        [HttpPost("resend-code")]
        public async Task<IActionResult> ResendCode([FromBody] ResendCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { error = "Email is required" });

            // Find user even if already verified (device trust challenge needs this)
            var user = await _userAccountService.GetUserByEmailOrUsernameAsync(request.Email.Trim());
            if (user == null)
                return BadRequest(new { error = "User not found" });

            // Always generate a fresh code for this email
            await _verificationService.GenerateAndSendCodeAsync(user.Id, user.EmailAddress);

            return Ok(new { success = true });
        }

        [HttpPost("verify-reset-code")]
        public async Task<IActionResult> VerifyResetCode([FromBody] VerifyCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
                return BadRequest(new { error = "Email and code are required" });

            var result = await _verificationService.VerifyResetCodeAsync(request.Email.Trim(), request.Code.Trim());

            if (!result.Success || string.IsNullOrWhiteSpace(result.ResetToken))
                return BadRequest(new { error = result.Error ?? "Invalid or expired code" });

            return Ok(new
            {
                success = true,
                resetToken = result.ResetToken
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.EmailUsername))
            {
                return BadRequest(new { errorCode = "Invalid", error = "Email/Username is required" });
            }

            var value = request.EmailUsername.Trim();

            // Look up by username OR email
            var user = await _userAccountService.GetUserByEmailOrUsernameAsync(value);
            if (user == null)
            {
                // Do NOT leak which emails exist if you want security,
                // but since your UI wants a specific message, we return NotFound.
                return NotFound(new { errorCode = "NotFound", error = "User not found" });
            }

            // If the user account isn't verified, they should verify account first
            // (recommended, otherwise you create a password reset path that bypasses account verification)
            if (!user.IsVerified)
            {
                // Optionally you could re-send their signup verification code here instead
                // await _verificationService.GenerateAndSendCodeAsync(user.Id, user.EmailAddress);

                return Unauthorized(new
                {
                    errorCode = "NotVerified",
                    error = "Account not verified",
                    email = user.EmailAddress
                });
            }

            // Send code (same code mechanism you use for verify-identity)
            await _verificationService.GenerateAndSendCodeAsync(user.Id, user.EmailAddress);

            return Ok(new
            {
                success = true,
                email = user.EmailAddress
            });
        }

        [HttpPost("create-new-password")]
        public async Task<IActionResult> CreateNewPassword([FromBody] CreateNewPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ResetToken) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new { error = "ResetToken and NewPassword are required" });

            var tokenHash = CryptoUtils.Sha256Hex(request.ResetToken.Trim());

            var (success, error) = await _userAccountService.ResetPasswordWithTokenAsync(tokenHash, request.NewPassword);

            if (!success)
                return BadRequest(new { error = error ?? "Invalid or expired reset token" });

            return Ok(new { success = true });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(new { error = "CurrentPassword and NewPassword are required" });

            try
            {
                // 1) Read auth cookie
                var token = Request.Cookies["auth_token"];
                if (string.IsNullOrWhiteSpace(token))
                    return Unauthorized(new { error = "Not authenticated" });

                // 2) Validate token -> userId
                var tokenInfo = _authCookieService.ValidateToken(token);
                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                    return Unauthorized(new { error = "Auth token expired" });

                // 3) Load user
                var user = await _userAccountService.GetUserByIdAsync(tokenInfo.UserId);
                if (user == null)
                    return Unauthorized(new { error = "User not found" });

                // 4) Verify current password
                if (!PasswordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
                    return BadRequest(new { error = "Current password is incorrect" });

                // ✅ THIS IS THE EXACT REUSE YOU ASKED FOR:
                var pwdError = SignUpValidator.ValidatePassword(request.NewPassword);
                if (pwdError != null)
                    return BadRequest(new { error = pwdError });

                // 5) Save new password hash
                var newHash = PasswordHasher.HashPassword(request.NewPassword);
                var updated = await _userAccountService.UpdatePasswordHashAsync(user.Id, newHash);

                if (!updated)
                    return StatusCode(500, new { error = "Unable to update password" });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error while changing password." });
            }
        }

        [HttpPost("edit-profile")]
        public async Task<IActionResult> EditProfile([FromBody] UpdateProfileRequest request)
        {
            // 0) Validate body fields
            var errors = EditProfileValidator.Validate(request);
            if (errors.Count > 0)
                return BadRequest(new { errors });

            try
            {
                // 1) Read auth cookie
                var token = Request.Cookies["auth_token"];
                if (string.IsNullOrWhiteSpace(token))
                    return Unauthorized(new { error = "Not authenticated" });

                // 2) Validate token -> userId
                UserTokenInfo? tokenInfo;
                try
                {
                    tokenInfo = _authCookieService.ValidateToken(token);
                }
                catch
                {
                    return Unauthorized(new { error = "Invalid auth token" });
                }

                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                    return Unauthorized(new { error = "Auth token expired" });

                // 3) Ensure user exists
                var user = await _userAccountService.GetUserByIdAsync(tokenInfo.UserId);
                if (user == null)
                    return Unauthorized(new { error = "User not found" });

                var newEmail = request.Email!.Trim();
                var newUsername = request.Username!.Trim();

                // 4) Uniqueness checks (exclude yourself)
                if (await _userAccountService.AnyOtherUserHasEmailAsync(user.Id, newEmail))
                    return BadRequest(new { errors = new Dictionary<string, string> { ["email"] = "Email already taken" } });

                if (await _userAccountService.AnyOtherUserHasUsernameAsync(user.Id, newUsername))
                    return BadRequest(new { errors = new Dictionary<string, string> { ["username"] = "Username already taken" } });

                // 5) Update
                var updated = await _userAccountService.UpdateProfileAsync(
                    user.Id,
                    request.FirstName!,
                    request.LastName!,
                    newEmail,
                    newUsername,
                    request.Bio
                );

                if (!updated)
                    return StatusCode(500, new { error = "Unable to update profile" });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error while updating profile." });
            }
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            try
            {
                Response.Cookies.Delete("auth_token", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = !_environment.IsDevelopment(),
                    SameSite = SameSiteMode.Lax,
                    Path = "/"
                });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error while logging out." });
            }
        }


    }
}
