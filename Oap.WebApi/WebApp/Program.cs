using Microsoft.AspNetCore.Http.Features;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

var builder = WebApplication.CreateBuilder(args);

// ── Request size limits ────────────────────────────────────────────────────────
// ALL four of these must be set together. Kestrel's MaxRequestBodySize alone is
// not enough — ASP.NET's multipart form reader has its own independent limits
// that will reject large files with a 400 before Kestrel's limit is even checked.

const long FourGb = 4L * 1024 * 1024 * 1024;

// 1. Kestrel transport-level limit.
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = FourGb;
});

// 2. ASP.NET multipart form reader limits.
//    - MultipartBodyLengthLimit  : max size of any single file part.
//    - ValueLengthLimit          : max size of any non-file form field value
//                                  (defaults to ~4 MB — will reject large text fields).
//    - MultipartBoundaryLengthLimit: max length of the MIME boundary string
//                                  (default 128 is fine but set explicitly for clarity).
//    - ValueCountLimit           : max number of form values (default 1024 is fine).
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = FourGb;
    options.ValueLengthLimit = int.MaxValue;   // non-file fields
    options.MultipartBoundaryLengthLimit = 256;           // boundary string length
    options.ValueCountLimit = 4096;
    options.BufferBodyLengthLimit = FourGb;
    options.MemoryBufferThreshold = int.MaxValue;   // keep buffering in memory
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddMemoryCache();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:8080")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddScoped<TrustedDeviceService>();
builder.Services.AddScoped<IUserAccount, UserAccountService>();
builder.Services.AddScoped<IVerificationUserAccount, VerificationUserAccountService>();
builder.Services.AddScoped<AuthCookieService>();
builder.Services.AddScoped<AuthCookieIssuerService>();
builder.Services.AddSingleton<EmailService>();
builder.Services.AddScoped<IProfileApplication, ProfileApplicationService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("DevCorsPolicy");
}

app.UseRouting();

app.UseMiddleware<Oap.WebApp.Middleware.AuthTokenMiddleware>();

app.MapControllers();
app.Run();