using Microsoft.Data.SqlClient;

namespace Oap.WebApp.Utilities
{
    public static class SqlExceptionHelper
    {
        public static bool IsUniqueViolation(SqlException ex)
            => ex.Number == 2627 || ex.Number == 2601;

        public static bool IsCancellation(SqlException ex)
        {
            if (ex.Message.Contains("Operation cancelled by user",
                    StringComparison.OrdinalIgnoreCase))
                return true;

            foreach (SqlError err in ex.Errors)
            {
                if (err.Number == 0 || err.Number == 3980)
                    return true;
            }

            return false;
        }
    }
}