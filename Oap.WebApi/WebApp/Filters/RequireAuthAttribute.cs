using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using WebApp.Utilities;

namespace WebApp.Filters
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class RequireAuthAttribute : Attribute, IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var user = context.HttpContext.Items["User"] as UserTokenInfo;
            if (user == null)
            {
                context.Result = new UnauthorizedObjectResult(new { error = "Unauthorized" });
                return;
            }

            await next();
        }
    }
}
