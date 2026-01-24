using Microsoft.AspNetCore.Mvc;
using WebApp.Filters;
using WebApp.Utilities;

namespace WebApp.Controllers
{
    [ApiController]
    [Route("api")]
    public class AuthController : ControllerBase
    {
        [HttpGet("me")]
        [RequireAuth]
        public IActionResult Me()
        {
            var user = HttpContext.Items["User"] as UserTokenInfo;

            if (user == null) return Unauthorized(new { error = "Unauthorized" });

            return Ok(new { userId = user.UserId, username = user.Username });
        }
    }
}
