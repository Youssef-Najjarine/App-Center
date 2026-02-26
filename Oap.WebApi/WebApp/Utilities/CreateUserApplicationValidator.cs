using Microsoft.AspNetCore.Http;
using Oap.WebApp.DTOs.UserApplication;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Oap.WebApp.Utilities
{
    public static class CreateUserApplicationValidator
    {
        private const long MaxZipBytes = 80L * 1024 * 1024;
        private const long MaxImageBytes = 8L * 1024 * 1024;
        private const long MaxVideoBytes = 80L * 1024 * 1024;

        private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

        private static readonly HashSet<string> AllowedVideoTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "video/mp4",
            "video/webm",
            "video/quicktime"
        };

        public static Dictionary<string, string> Validate(CreateUserApplicationFormRequest req)
        {
            var errors = new Dictionary<string, string>();

            // Basic fields
            if (string.IsNullOrWhiteSpace(req.Name))
                errors["name"] = "Name is required";

            if (req.Price == null)
                errors["price"] = "Price is required";

            if (string.IsNullOrWhiteSpace(req.Description))
                errors["description"] = "Description is required";

            if (req.Technologies == null || req.Technologies.Count == 0)
                errors["technologies"] = "At least one technology is required";

            // Zip
            if (req.ZipFile == null || req.ZipFile.Length == 0)
            {
                errors["zipFile"] = "Zip file is required";
            }
            else
            {
                if (!req.ZipFile.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    errors["zipFile"] = "Only .zip files are allowed";
                else if (req.ZipFile.Length > MaxZipBytes)
                    errors["zipFile"] = $"Zip file must be <= {MaxZipBytes / (1024 * 1024)} MB";
            }

            var media = req.Media ?? new List<IFormFile>();

            if (media.Count > 6)
            {
                errors["media"] = "Max 6 media items allowed (5 images + 1 video)";
            }

            var imageCount = 0;
            var videoCount = 0;

            foreach (var f in media)
            {
                if (f == null || f.Length == 0) continue;

                var detected = DetectActualContentType(f);

                if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                {
                    if (!errors.ContainsKey("media"))
                        errors["media"] = "GIF files are not allowed. Please upload MP4, WebM, or MOV (QuickTime) instead.";
                    continue;
                }

                if (IsAllowedImageDetected(detected))
                {
                    imageCount++;

                    if (!errors.ContainsKey("media") && f.Length > MaxImageBytes)
                        errors["media"] = $"Each image must be <= {MaxImageBytes / (1024 * 1024)} MB";
                }
                else if (IsAllowedVideoDetected(detected))
                {
                    videoCount++;

                    if (!errors.ContainsKey("media") && f.Length > MaxVideoBytes)
                        errors["media"] = $"Video must be <= {MaxVideoBytes / (1024 * 1024)} MB";
                }
                else
                {
                    if (!errors.ContainsKey("media"))
                    {
                        errors["media"] =
                            "Media must be JPG/PNG/WebP images or MP4/WebM/MOV videos. GIF files are not allowed.";
                    }
                }

                var claimed = (f.ContentType ?? "").Trim();
                if (!string.IsNullOrWhiteSpace(claimed))
                {
                    if (claimed.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                    {
                        if (string.Equals(claimed, "image/gif", StringComparison.OrdinalIgnoreCase))
                        {
                            if (!errors.ContainsKey("media"))
                                errors["media"] = "GIF files are not allowed. Please upload MP4, WebM, or MOV (QuickTime) instead.";
                        }
                        else if (!AllowedImageTypes.Contains(claimed))
                        {
                            if (!errors.ContainsKey("media"))
                                errors["media"] = "Only JPG, PNG, or WebP images are allowed.";
                        }
                    }
                    else if (claimed.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!AllowedVideoTypes.Contains(claimed))
                        {
                            if (!errors.ContainsKey("media"))
                                errors["media"] = "Only MP4, WebM, or MOV (QuickTime) videos are allowed.";
                        }
                    }
                }
            }

            if (imageCount > 5 && errors.GetValueOrDefault("media") != "Max 6 media items allowed (5 images + 1 video)")
                errors["media"] = "Max 5 images allowed";

            if (videoCount > 1 && errors.GetValueOrDefault("media") != "Max 6 media items allowed (5 images + 1 video)")
                errors["media"] = "Max 1 video allowed";

            if (media.Count > 0)
            {
                if (req.PresentationIndex < 0 || req.PresentationIndex >= media.Count)
                    errors["presentationIndex"] = "Presentation index is invalid";
            }

            return errors;
        }

        private static bool IsAllowedImageDetected(string detectedContentType)
            => !string.IsNullOrWhiteSpace(detectedContentType) && AllowedImageTypes.Contains(detectedContentType);

        private static bool IsAllowedVideoDetected(string detectedContentType)
            => !string.IsNullOrWhiteSpace(detectedContentType) && AllowedVideoTypes.Contains(detectedContentType);

        private static string DetectActualContentType(IFormFile file)
        {
            try
            {
                using var s = file.OpenReadStream();

                Span<byte> header = stackalloc byte[64];
                var read = s.Read(header);
                if (read <= 0) return "";

                var h = header.Slice(0, read);

                if (h.Length >= 6)
                {
                    var sig = System.Text.Encoding.ASCII.GetString(h.Slice(0, 6));
                    if (sig == "GIF87a" || sig == "GIF89a") return "image/gif";
                }

                if (h.Length >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF)
                    return "image/jpeg";

                if (h.Length >= 8 &&
                    h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47 &&
                    h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A)
                    return "image/png";

                if (h.Length >= 12)
                {
                    var riff = System.Text.Encoding.ASCII.GetString(h.Slice(0, 4));
                    var webp = System.Text.Encoding.ASCII.GetString(h.Slice(8, 4));
                    if (riff == "RIFF" && webp == "WEBP") return "image/webp";
                }

                if (h.Length >= 4 && h[0] == 0x1A && h[1] == 0x45 && h[2] == 0xDF && h[3] == 0xA3)
                    return "video/webm";

                if (h.Length >= 12)
                {
                    var ftyp = System.Text.Encoding.ASCII.GetString(h.Slice(4, 4));
                    if (ftyp == "ftyp")
                    {
                        var brand = System.Text.Encoding.ASCII.GetString(h.Slice(8, 4));
                        if (brand == "qt  ") return "video/quicktime";
                        return "video/mp4";
                    }
                }

                return "";
            }
            catch
            {
                return "";
            }
        }
    }
}