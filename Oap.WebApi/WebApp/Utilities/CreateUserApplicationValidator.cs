using Microsoft.AspNetCore.Http;
using Oap.WebApp.DTOs.UserApplication;

namespace Oap.WebApp.Utilities
{
    public static class CreateUserApplicationValidator
    {
        private const long MaxZipBytes = 4L * 1024 * 1024 * 1024;
        private const long MaxImageBytes = 4L * 1024 * 1024 * 1024;
        private const long MaxVideoBytes = 4L * 1024 * 1024 * 1024;

        public static Dictionary<string, string> Validate(CreateUserApplicationFormRequest req)
        {
            var errors = new Dictionary<string, string>();

            if (string.IsNullOrWhiteSpace(req.Name))
                errors["name"] = "Name is required";

            if (req.Price == null)
                errors["price"] = "Price is required";

            if (string.IsNullOrWhiteSpace(req.Description))
                errors["description"] = "Description is required";

            if (req.Technologies == null || req.Technologies.Count == 0)
                errors["technologies"] = "At least one technology is required";

            if (req.ZipFile == null || req.ZipFile.Length == 0)
            {
                errors["zipFile"] = "Zip file is required";
            }
            else
            {
                if (!req.ZipFile.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    errors["zipFile"] = "Only .zip files are allowed";
                else if (req.ZipFile.Length > MaxZipBytes)
                    errors["zipFile"] = $"Zip file must be <= {MaxZipBytes / (1024L * 1024 * 1024)} GB";
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

                var detected = MediaTypeDetector.DetectContentType(f);

                if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                {
                    if (!errors.ContainsKey("media"))
                        errors["media"] = "GIF files are not allowed. Please upload MP4, WebM, or MOV (QuickTime) instead.";
                    continue;
                }

                if (MediaTypeDetector.IsAllowedImage(detected))
                {
                    imageCount++;
                    if (!errors.ContainsKey("media") && f.Length > MaxImageBytes)
                        errors["media"] = $"Each image must be <= {MaxImageBytes / (1024L * 1024 * 1024)} GB";
                }
                else if (MediaTypeDetector.IsAllowedVideo(detected))
                {
                    videoCount++;
                    if (!errors.ContainsKey("media") && f.Length > MaxVideoBytes)
                        errors["media"] = $"Video must be <= {MaxVideoBytes / (1024L * 1024 * 1024)} GB";
                }
                else
                {
                    if (!errors.ContainsKey("media"))
                        errors["media"] = "Media must be JPG/PNG/WebP images or MP4/WebM/MOV videos. GIF files are not allowed.";
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
                        else if (!MediaTypeDetector.AllowedImageTypes.Contains(claimed))
                        {
                            if (!errors.ContainsKey("media"))
                                errors["media"] = "Only JPG, PNG, or WebP images are allowed.";
                        }
                    }
                    else if (claimed.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!MediaTypeDetector.AllowedVideoTypes.Contains(claimed))
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
    }
}