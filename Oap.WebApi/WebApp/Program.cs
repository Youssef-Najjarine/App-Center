using Microsoft.AspNetCore.Http.Features;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 4L * 1024 * 1024 * 1024;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 4L * 1024 * 1024 * 1024;
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
builder.Services.AddScoped<IUserApplication, UserApplicationService>();

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