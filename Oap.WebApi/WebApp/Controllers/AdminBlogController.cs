using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.DTOs.Blog;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/admin/blog")]
    public class AdminBlogController : ControllerBase
    {
        private readonly AdminCookieService _adminCookieService;
        private readonly IBlog _blogService;

        public AdminBlogController(
            AdminCookieService adminCookieService,
            IBlog blogService)
        {
            _adminCookieService = adminCookieService;
            _blogService = blogService;
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

        [HttpPost("")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 100 * 1024 * 1024)]
        public async Task<IActionResult> CreateBlog([FromForm] CreateBlogRequest request)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                var (success, error, blogId) = await _blogService.CreateBlogAsync(admin.AdminId, request);
                if (!success) return BadRequest(new { success = false, error });

                return Ok(new { success = true, blogId });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error creating blog." });
            }
        }

        [HttpPut("{blogId:guid}")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 100 * 1024 * 1024)]
        public async Task<IActionResult> UpdateBlog([FromRoute] Guid blogId, [FromForm] UpdateBlogRequest request)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                var (success, error) = await _blogService.UpdateBlogAsync(admin.AdminId, blogId, request);
                if (!success) return BadRequest(new { success = false, error });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error updating blog." });
            }
        }

        [HttpDelete("{blogId:guid}")]
        public async Task<IActionResult> DeleteBlog([FromRoute] Guid blogId)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                var (success, error) = await _blogService.DeleteBlogAsync(admin.AdminId, blogId);
                if (!success) return BadRequest(new { success = false, error });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error deleting blog." });
            }
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetAdminBlogs([FromQuery] string? q, [FromQuery] string? sort)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                var blogs = await _blogService.GetAdminBlogsAsync(admin.AdminId, q?.Trim(), sort?.Trim());
                return Ok(new { success = true, blogs });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading blogs." });
            }
        }

        [HttpGet("{blogId:guid}")]
        public async Task<IActionResult> GetAdminBlogDetail([FromRoute] Guid blogId)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                var blog = await _blogService.GetAdminBlogDetailAsync(admin.AdminId, blogId);
                if (blog == null) return NotFound(new { success = false, error = "Blog not found." });

                return Ok(new { success = true, blog });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading blog." });
            }
        }
    }
}