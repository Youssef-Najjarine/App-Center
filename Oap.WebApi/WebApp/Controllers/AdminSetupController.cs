using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/admin-setup")]
    public class AdminSetupController : ControllerBase
    {
        [HttpGet("hash-password")]
        public IActionResult HashPassword([FromQuery] string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return BadRequest(new { error = "Password query param is required." });

            var hash = PasswordHasher.HashPassword(password);
            return Ok(new { hash });
        }
    }
}