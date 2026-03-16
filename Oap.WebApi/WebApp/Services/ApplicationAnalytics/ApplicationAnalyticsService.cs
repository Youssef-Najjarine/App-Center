using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.ApplicationAnalytics;
using Oap.WebApp.Interfaces;
using System.Data;
using System.Text;

namespace Oap.WebApp.Services
{
    public class ApplicationAnalyticsService : IApplicationAnalytics
    {
        private readonly string _connectionString;

        public ApplicationAnalyticsService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task IngestEventsAsync(Guid? viewerUserId, List<AnalyticsEventItem> events)
        {
            if (events == null || events.Count == 0) return;

            var valid = events
                .Where(e => e.AppId != Guid.Empty && (e.EventType == 1 || e.EventType == 2))
                .Take(100)
                .ToList();

            if (valid.Count == 0) return;

            var sb = new StringBuilder();
            sb.Append("INSERT INTO dbo.ApplicationAnalyticsEvent (UserApplicationId, ViewerUserId, EventType, OccurredAtUtc) VALUES ");

            var parameters = new List<SqlParameter>();
            for (int i = 0; i < valid.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append($"(@a{i}, @v{i}, @t{i}, @d{i})");
                parameters.Add(new SqlParameter($"@a{i}", SqlDbType.UniqueIdentifier) { Value = valid[i].AppId });
                parameters.Add(new SqlParameter($"@v{i}", SqlDbType.UniqueIdentifier)
                {
                    Value = viewerUserId.HasValue ? (object)viewerUserId.Value : DBNull.Value
                });
                parameters.Add(new SqlParameter($"@t{i}", SqlDbType.TinyInt) { Value = valid[i].EventType });

                DateTime ts = DateTime.UtcNow;
                if (!string.IsNullOrWhiteSpace(valid[i].Timestamp) &&
                    DateTime.TryParse(valid[i].Timestamp, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
                    ts = parsed.ToUniversalTime();
                parameters.Add(new SqlParameter($"@d{i}", SqlDbType.DateTime2) { Value = ts });
            }

            sb.Append(';');

            try
            {
                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                await using var cmd = new SqlCommand(sb.ToString(), conn);
                cmd.Parameters.AddRange(parameters.ToArray());
                cmd.CommandTimeout = 10;
                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Analytics ingestion failed: {ex.Message}");
            }
        }

        public async Task<ApplicationChartDataResponse> GetChartDataAsync(Guid ownerUserId, Guid appId, string period)
        {
            var (startDate, groupBy, labelFormat) = ParsePeriod(period);

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            {
                const string sql = "SELECT TOP 1 1 FROM dbo.UserApplication WHERE Id = @AppId AND OwnerUserId = @OwnerId;";
                await using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                if (await cmd.ExecuteScalarAsync() == null)
                    return new ApplicationChartDataResponse();
            }

            var dataSql = groupBy switch
            {
                "day" => @"
SELECT CAST(e.OccurredAtUtc AS DATE) AS Bucket,
       SUM(CASE WHEN e.EventType = 1 THEN 1 ELSE 0 END) AS Impressions,
       SUM(CASE WHEN e.EventType = 2 THEN 1 ELSE 0 END) AS Clicks
FROM dbo.ApplicationAnalyticsEvent e WITH (NOLOCK)
WHERE e.UserApplicationId = @AppId AND e.OccurredAtUtc >= @StartDate
GROUP BY CAST(e.OccurredAtUtc AS DATE)
ORDER BY Bucket;",

                "week" => @"
SELECT DATEADD(DAY, -(DATEPART(WEEKDAY, e.OccurredAtUtc) - 1), CAST(e.OccurredAtUtc AS DATE)) AS Bucket,
       SUM(CASE WHEN e.EventType = 1 THEN 1 ELSE 0 END) AS Impressions,
       SUM(CASE WHEN e.EventType = 2 THEN 1 ELSE 0 END) AS Clicks
FROM dbo.ApplicationAnalyticsEvent e WITH (NOLOCK)
WHERE e.UserApplicationId = @AppId AND e.OccurredAtUtc >= @StartDate
GROUP BY DATEADD(DAY, -(DATEPART(WEEKDAY, e.OccurredAtUtc) - 1), CAST(e.OccurredAtUtc AS DATE))
ORDER BY Bucket;",

                _ => @"
SELECT DATEFROMPARTS(YEAR(e.OccurredAtUtc), MONTH(e.OccurredAtUtc), 1) AS Bucket,
       SUM(CASE WHEN e.EventType = 1 THEN 1 ELSE 0 END) AS Impressions,
       SUM(CASE WHEN e.EventType = 2 THEN 1 ELSE 0 END) AS Clicks
FROM dbo.ApplicationAnalyticsEvent e WITH (NOLOCK)
WHERE e.UserApplicationId = @AppId AND e.OccurredAtUtc >= @StartDate
GROUP BY DATEFROMPARTS(YEAR(e.OccurredAtUtc), MONTH(e.OccurredAtUtc), 1)
ORDER BY Bucket;"
            };

            var result = new ApplicationChartDataResponse();

            await using var dataCmd = new SqlCommand(dataSql, conn);
            dataCmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
            dataCmd.Parameters.Add("@StartDate", SqlDbType.DateTime2).Value = startDate;

            await using var reader = await dataCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var bucket = reader.GetDateTime(0);
                var impressions = reader.GetInt32(1);
                var clicks = reader.GetInt32(2);

                var label = labelFormat switch
                {
                    "d" => bucket.ToString("MMM d"),
                    "w" => bucket.ToString("MMM d"),
                    _ => bucket.ToString("MMM")
                };

                result.DataPoints.Add(new ChartDataPoint
                {
                    Label = label,
                    Impressions = impressions,
                    Clicks = clicks,
                });
                result.TotalImpressions += impressions;
                result.TotalClicks += clicks;
            }

            return result;
        }

        public async Task<Dictionary<Guid, (long impressions, long clicks)>> GetBulkTotalsAsync(Guid ownerUserId)
        {
            var result = new Dictionary<Guid, (long, long)>();

            const string sql = @"
SELECT e.UserApplicationId,
       CAST(SUM(CASE WHEN e.EventType = 1 THEN 1 ELSE 0 END) AS BIGINT) AS Impressions,
       CAST(SUM(CASE WHEN e.EventType = 2 THEN 1 ELSE 0 END) AS BIGINT) AS Clicks
FROM dbo.ApplicationAnalyticsEvent e WITH (NOLOCK)
JOIN dbo.UserApplication ua WITH (NOLOCK) ON ua.Id = e.UserApplicationId
WHERE ua.OwnerUserId = @OwnerId
GROUP BY e.UserApplicationId;";

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var appId = reader.GetGuid(0);
                var impressions = reader.GetInt64(1);
                var clicks = reader.GetInt64(2);
                result[appId] = (impressions, clicks);
            }

            return result;
        }

        public async Task<Dictionary<Guid, (long impressions, long clicks)>> GetBulkPopularityAsync(List<Guid> appIds)
        {
            var result = new Dictionary<Guid, (long, long)>();
            if (appIds == null || appIds.Count == 0) return result;

            var paramNames = appIds.Select((_, i) => $"@a{i}").ToList();
            var inClause = string.Join(", ", paramNames);

            var sql = $@"
SELECT e.UserApplicationId,
       CAST(SUM(CASE WHEN e.EventType = 1 THEN 1 ELSE 0 END) AS BIGINT) AS Impressions,
       CAST(SUM(CASE WHEN e.EventType = 2 THEN 1 ELSE 0 END) AS BIGINT) AS Clicks
FROM dbo.ApplicationAnalyticsEvent e WITH (NOLOCK)
WHERE e.UserApplicationId IN ({inClause})
GROUP BY e.UserApplicationId;";

            try
            {
                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                await using var cmd = new SqlCommand(sql, conn);
                for (int i = 0; i < appIds.Count; i++)
                    cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = appIds[i];

                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var appId = reader.GetGuid(0);
                    result[appId] = (reader.GetInt64(1), reader.GetInt64(2));
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"GetBulkPopularityAsync failed: {ex.Message}");
            }

            return result;
        }

        private static (DateTime startDate, string groupBy, string labelFormat) ParsePeriod(string period)
        {
            var now = DateTime.UtcNow;
            return period switch
            {
                "7d" => (now.AddDays(-7), "day", "d"),
                "30d" => (now.AddDays(-30), "day", "d"),
                "6m" => (now.AddMonths(-6), "month", "m"),
                "1y" => (now.AddYears(-1), "month", "m"),
                _ => (now.AddMonths(-6), "month", "m"),
            };
        }
    }
}