using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Utilities;
using Microsoft.Data.SqlClient;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/store")]
    public class StoreApplicationController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IStoreApplication _storeService;

        public StoreApplicationController(
            AuthCookieService authCookieService,
            IStoreApplication storeService)
        {
            _authCookieService = authCookieService;
            _storeService = storeService;
        }

        private Guid? GetOptionalUserId()
        {
            var token = Request.Cookies["auth_token"];
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var tokenInfo = _authCookieService.ValidateToken(token);
                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow) return null;
                return tokenInfo.UserId;
            }
            catch { return null; }
        }

        [HttpGet("get-all-cards")]
        public async Task<IActionResult> GetAllStoreCards()
        {
            try
            {
                var cards = await _storeService.GetAllStoreCardsAsync();
                var currentUserId = GetOptionalUserId();

                return Ok(new
                {
                    success = true,
                    applications = cards,
                    currentUserId = currentUserId,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading applications." });
            }
        }

        [HttpPost("get-bulk-technologies")]
        public async Task<IActionResult> GetStoreBulkTechnologies([FromBody] StoreBulkTechnologiesRequest request)
        {
            try
            {
                if (request?.VersionIds == null || request.VersionIds.Count == 0)
                    return Ok(new { success = true, technologies = new Dictionary<string, List<string>>() });

                var validIds = request.VersionIds
                    .Where(id => id != Guid.Empty)
                    .Distinct()
                    .ToList();

                var result = await _storeService.GetStoreBulkTechnologiesAsync(validIds);
                return Ok(new { success = true, technologies = result });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading technologies." });
            }
        }

        [HttpGet("get-application-details/{userApplicationId:guid}")]
        public async Task<IActionResult> GetStoreApplicationDetails([FromRoute] Guid userApplicationId)
        {
            try
            {
                var item = await _storeService.GetStoreApplicationDetailsAsync(userApplicationId);
                if (item == null) return NotFound(new { success = false, error = "Not found" });

                var currentUserId = GetOptionalUserId();

                return Ok(new
                {
                    success = true,
                    application = item,
                    currentUserId = currentUserId,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading application." });
            }
        }

        [HttpGet("search-cards")]
        public async Task<IActionResult> SearchStoreCards(
            [FromQuery] string? q,
            [FromQuery] string? sort)
        {
            try
            {
                var cards = await _storeService.SearchStoreCardsAsync(q?.Trim(), sort?.Trim());
                var currentUserId = GetOptionalUserId();

                return Ok(new
                {
                    success = true,
                    applications = cards,
                    currentUserId = currentUserId,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while searching applications." });
            }
        }

        [HttpGet("file/{fileId:guid}")]
        public async Task<IActionResult> GetPublicFile([FromRoute] Guid fileId)
        {
            try
            {
                var meta = await _storeService.GetPublicFileMetaAsync(fileId);
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
                        if (!string.IsNullOrEmpty(startStr)) rangeStart = long.Parse(startStr);
                        if (!string.IsNullOrEmpty(endStr)) rangeEnd = long.Parse(endStr);
                        else rangeEnd = Math.Min(rangeStart + (2L * 1024 * 1024) - 1, totalLength - 1);
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

                await _storeService.StreamPublicFileRangeAsync(
                    fileId, rangeStart, chunkLength,
                    Response.Body, HttpContext.RequestAborted);

                return new EmptyResult();
            }
            catch (OperationCanceledException) { return new EmptyResult(); }
            catch (SqlException ex) when (SqlExceptionHelper.IsCancellation(ex)) { return new EmptyResult(); }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500);
            }
        }
    }

    public class StoreBulkTechnologiesRequest
    {
        public List<Guid> VersionIds { get; set; } = new();
    }
}