using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;
using Microsoft.Data.SqlClient;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/user-application")]
    public class ProfileApplicationController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IProfileApplication _profileAppService;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public ProfileApplicationController(
            AuthCookieService authCookieService,
            IProfileApplication profileAppService,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _authCookieService = authCookieService;
            _profileAppService = profileAppService;
            _environment = environment;
            _configuration = configuration;
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

            if (request.IsDraft)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                    return BadRequest(new { success = false, errors = new { name = "App name is required." } });
            }
            else
            {
                var errors = CreateUserApplicationValidator.Validate(request);
                if (errors.Count > 0)
                    return BadRequest(new { success = false, errors });
            }

            try
            {
                var result = await _profileAppService.CreateUserApplicationAsync(tokenInfo.UserId, request);
                if (!result.Success)
                    return StatusCode(500, new { success = false, error = result.Error });

                var card = await _profileAppService.GetCreatedCardAsync(
                    tokenInfo.UserId,
                    result.UserApplicationId,
                    result.UserApplicationVersionId);

                return Ok(new
                {
                    success = true,
                    userApplicationId = result.UserApplicationId,
                    userApplicationVersionId = result.UserApplicationVersionId,
                    card,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while creating application." });
            }
        }

        [HttpPut("update-user-application/{userApplicationId:guid}")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 4L * 1024 * 1024 * 1024)]
        public async Task<IActionResult> UpdateUserApplication(
            [FromRoute] Guid userApplicationId,
            [FromForm] UpdateUserApplicationFormRequest request)
        {
            var tokenInfo = GetAuthedUser();
            if (tokenInfo == null)
                return Unauthorized(new { error = "Not authenticated" });

            var hasExistingZip = await _profileAppService.HasZipFileAsync(tokenInfo.UserId, userApplicationId);

            if (request.IsDraft)
            {
                if (string.IsNullOrWhiteSpace(request.Name))
                    return BadRequest(new { success = false, errors = new { name = "App name is required." } });
            }
            else
            {
                var errors = UpdateUserApplicationValidator.Validate(request, hasExistingZip);
                if (errors.Count > 0)
                    return BadRequest(new { success = false, errors });
            }

            try
            {
                var result = await _profileAppService.UpdateUserApplicationAsync(
                    tokenInfo.UserId, userApplicationId, request);

                if (!result.Success)
                    return StatusCode(500, new { success = false, error = result.Error });

                var card = await _profileAppService.GetCreatedCardAsync(
                    tokenInfo.UserId,
                    result.UserApplicationId,
                    result.UserApplicationVersionId);

                return Ok(new
                {
                    success = true,
                    userApplicationId = result.UserApplicationId,
                    userApplicationVersionId = result.UserApplicationVersionId,
                    card,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while updating application." });
            }
        }

        [HttpDelete("delete-user-application/{userApplicationId:guid}")]
        public async Task<IActionResult> DeleteUserApplication([FromRoute] Guid userApplicationId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var success = await _profileAppService.DeleteUserApplicationAsync(tokenInfo.UserId, userApplicationId);
                if (!success)
                    return NotFound(new { success = false, error = "Application not found or already deleted." });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while deleting application." });
            }
        }

        [HttpGet("get-all-draft-cards")]
        public async Task<IActionResult> GetAllMyDraftCards()
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var items = await _profileAppService.GetAllDraftCardsAsync(tokenInfo.UserId);
                return Ok(new { success = true, applications = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading drafts." });
            }
        }

        [HttpGet("search-draft-cards")]
        public async Task<IActionResult> SearchDraftCards(
            [FromQuery] string? q,
            [FromQuery] string? sort)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var items = await _profileAppService.SearchDraftCardsAsync(
                    tokenInfo.UserId, q?.Trim(), sort?.Trim());

                return Ok(new { success = true, applications = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while searching drafts." });
            }
        }

        [HttpPost("create-draft-copy/{sourceAppId:guid}")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 4L * 1024 * 1024 * 1024)]
        public async Task<IActionResult> CreateDraftCopy(
            [FromRoute] Guid sourceAppId,
            [FromForm] UpdateUserApplicationFormRequest request)
        {
            var tokenInfo = GetAuthedUser();
            if (tokenInfo == null)
                return Unauthorized(new { error = "Not authenticated" });

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { success = false, errors = new { name = "App name is required." } });

            try
            {
                var result = await _profileAppService.CreateDraftCopyAsync(
                    tokenInfo.UserId, sourceAppId, request);

                if (!result.Success)
                    return StatusCode(500, new { success = false, error = result.Error });

                var card = await _profileAppService.GetCreatedCardAsync(
                    tokenInfo.UserId,
                    result.UserApplicationId,
                    result.UserApplicationVersionId);

                return Ok(new
                {
                    success = true,
                    userApplicationId = result.UserApplicationId,
                    userApplicationVersionId = result.UserApplicationVersionId,
                    card,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while creating draft copy." });
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

                var items = await _profileAppService.GetAllUserApplicationCardsAsync(tokenInfo.UserId);
                return Ok(new { success = true, applications = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading applications." });
            }
        }

        [HttpGet("search-user-application-cards")]
        public async Task<IActionResult> SearchMyUserApplicationCards(
            [FromQuery] string? q,
            [FromQuery] string? sort)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Unauthorized(new { error = "Not authenticated" });

                var items = await _profileAppService.SearchUserApplicationCardsAsync(
                    tokenInfo.UserId, q?.Trim(), sort?.Trim());

                return Ok(new { success = true, applications = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while searching applications." });
            }
        }

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

                var result = await _profileAppService.GetBulkTechnologiesAsync(tokenInfo.UserId, validIds);
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

                var items = await _profileAppService.GetAllUserApplicationDetailsAsync(tokenInfo.UserId);
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

                var tech = await _profileAppService.GetTechnologiesForVersionAsync(tokenInfo.UserId, userApplicationVersionId);
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

                var item = await _profileAppService.GetUserApplicationDetailsAsync(tokenInfo.UserId, userApplicationId);
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

                var meta = await _profileAppService.GetFileMetaIfOwnedAsync(tokenInfo.UserId, fileId);
                if (meta == null) return NotFound();

                Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
                Response.Headers["ETag"] = $"\"{fileId}\"";
                Response.Headers["Accept-Ranges"] = "bytes";

                var ifNoneMatch = Request.Headers["If-None-Match"].ToString();
                if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch.Contains($"\"{fileId}\""))
                    return StatusCode(304);

                var totalLength = meta.FileSize;

                long rangeStart = 0;
                long rangeEnd = totalLength - 1;
                bool isRangeRequest = false;

                var rangeHeader = Request.Headers["Range"].ToString();
                if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes="))
                {
                    var rangePart = rangeHeader.Substring(6);
                    var dashIdx = rangePart.IndexOf('-');
                    if (dashIdx >= 0)
                    {
                        var startStr = rangePart.Substring(0, dashIdx).Trim();
                        var endStr = rangePart.Substring(dashIdx + 1).Trim();

                        if (!string.IsNullOrEmpty(startStr))
                            rangeStart = long.Parse(startStr);

                        if (!string.IsNullOrEmpty(endStr))
                            rangeEnd = long.Parse(endStr);
                        else
                            rangeEnd = Math.Min(rangeStart + (2L * 1024 * 1024) - 1, totalLength - 1);

                        rangeEnd = Math.Min(rangeEnd, totalLength - 1);
                        isRangeRequest = true;
                    }
                }

                var chunkLength = rangeEnd - rangeStart + 1;

                if (isRangeRequest)
                {
                    Response.StatusCode = 206;
                    Response.Headers["Content-Range"] = $"bytes {rangeStart}-{rangeEnd}/{totalLength}";
                    Response.Headers["Content-Length"] = chunkLength.ToString();
                    Response.ContentType = meta.ContentType;
                }
                else
                {
                    Response.StatusCode = 200;
                    Response.Headers["Content-Length"] = totalLength.ToString();
                    Response.ContentType = meta.ContentType;
                }

                await _profileAppService.StreamFileRangeAsync(
                    tokenInfo.UserId,
                    fileId,
                    rangeStart,
                    chunkLength,
                    Response.Body,
                    HttpContext.RequestAborted);

                return new EmptyResult();
            }
            catch (OperationCanceledException)
            {
                return new EmptyResult();
            }
            catch (SqlException ex) when (SqlExceptionHelper.IsCancellation(ex))
            {
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500);
            }
        }
    }
}