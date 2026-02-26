using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/user-application")]
    public class UserApplicationController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IUserApplication _userApplicationService;
        private readonly IWebHostEnvironment _environment;

        public UserApplicationController(
            AuthCookieService authCookieService,
            IUserApplication userApplicationService,
            IWebHostEnvironment environment)
        {
            _authCookieService = authCookieService;
            _userApplicationService = userApplicationService;
            _environment = environment;
        }

        private UserTokenInfo? GetAuthedUser()
        {
            var token = Request.Cookies["auth_token"];
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var tokenInfo = _authCookieService.ValidateToken(token);
                if (tokenInfo == null) return null;
                if (tokenInfo.ExpiresUtc <= DateTime.UtcNow) return null;
                return tokenInfo;
            }
            catch { return null; }
        }

        [HttpPost("create-user-application")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 4L * 1024 * 1024 * 1024)]
        public async Task<IActionResult> CreateUserApplication([FromForm] CreateUserApplicationFormRequest request)
        {
            var token = Request.Cookies["auth_token"];
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized(new { error = "Not authenticated" });

            UserTokenInfo? tokenInfo;
            try { tokenInfo = _authCookieService.ValidateToken(token); }
            catch { return Unauthorized(new { error = "Invalid auth token" }); }

            if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                return Unauthorized(new { error = "Auth token expired" });

            var errors = CreateUserApplicationValidator.Validate(request);
            if (errors.Count > 0)
                return BadRequest(new { success = false, errors });

            try
            {
                var result = await _userApplicationService.CreateUserApplicationAsync(tokenInfo.UserId, request);
                if (!result.Success)
                    return StatusCode(500, new { success = false, error = result.Error });

                return Ok(new
                {
                    success = true,
                    userApplicationId = result.UserApplicationId,
                    userApplicationVersionId = result.UserApplicationVersionId,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while creating application." });
            }
        }

        [HttpGet("get-all-user-application-cards")]
        public async Task<IActionResult> GetAllMyUserApplicationCards()
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var items = await _userApplicationService.GetAllUserApplicationCardsAsync(tokenInfo.UserId);
                return Ok(new { success = true, applications = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading applications." });
            }
        }

        // ── Bulk technologies ─────────────────────────────────────────────────
        // Accepts all versionIds at once and returns a map of versionId -> string[].
        // Replaces N individual per-card technology requests with a single call.
        // Cache-warm hits are served in < 5 ms. Cold hits run ZIP reads in parallel.
        //
        // POST body: { "versionIds": ["guid1", "guid2", ...] }
        [HttpPost("get-bulk-technologies")]
        public async Task<IActionResult> GetBulkTechnologies([FromBody] BulkTechnologiesRequest request)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                if (request?.VersionIds == null || request.VersionIds.Count == 0)
                    return Ok(new { success = true, technologies = new Dictionary<string, List<string>>() });

                var validIds = request.VersionIds
                    .Where(id => id != Guid.Empty)
                    .Distinct()
                    .ToList();

                var result = await _userApplicationService.GetBulkTechnologiesAsync(tokenInfo.UserId, validIds);
                return Ok(new { success = true, technologies = result });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading technologies." });
            }
        }

        [HttpGet("get-all-user-application-details")]
        public async Task<IActionResult> GetAllMyUserApplications()
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var items = await _userApplicationService.GetAllUserApplicationDetailsAsync(tokenInfo.UserId);
                return Ok(new { success = true, applications = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading applications." });
            }
        }

        [HttpGet("get-user-application-technologies/{userApplicationVersionId:guid}")]
        public async Task<IActionResult> GetUserApplicationTechnologies([FromRoute] Guid userApplicationVersionId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var tech = await _userApplicationService.GetTechnologiesForVersionAsync(tokenInfo.UserId, userApplicationVersionId);
                return Ok(new { success = true, technologies = tech });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading technologies." });
            }
        }

        [HttpGet("get-user-application-details/{userApplicationId:guid}")]
        public async Task<IActionResult> GetUserApplicationDetails([FromRoute] Guid userApplicationId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var item = await _userApplicationService.GetUserApplicationDetailsAsync(tokenInfo.UserId, userApplicationId);
                if (item == null) return NotFound(new { success = false, error = "Not found" });
                return Ok(new { success = true, application = item });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading application." });
            }
        }

        [HttpGet("get-user-application-file/{fileId:guid}")]
        public async Task<IActionResult> GetUserApplicationFile([FromRoute] Guid fileId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var file = await _userApplicationService.GetFileIfOwnedByUserAsync(tokenInfo.UserId, fileId);
                if (file == null) return NotFound();

                Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
                Response.Headers["ETag"] = $"\"{file.Id}\"";
                return File(file.FileContents, file.ContentType, enableRangeProcessing: true);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500);
            }
        }
    }

    // Request DTO for the bulk-technologies endpoint.
    public class BulkTechnologiesRequest
    {
        public List<Guid> VersionIds { get; set; } = new();
    }
}