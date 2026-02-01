using Oap.WebApp.Utilities;

namespace Oap.WebApp.Extensions
{
    public static class HttpContextExtensions
    {
        public static UserTokenInfo? GetAuthUser(this HttpContext context)
        {
            return context.Items.TryGetValue("User", out var value)
                ? value as UserTokenInfo
                : null;
        }
    }
}
