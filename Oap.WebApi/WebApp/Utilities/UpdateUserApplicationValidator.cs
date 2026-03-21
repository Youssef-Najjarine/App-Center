using System.Text.Json;
using Oap.WebApp.DTOs.UserApplication;

namespace Oap.WebApp.Utilities
{
    public static class UpdateUserApplicationValidator
    {
        private const long MaxZipBytes = 4L * 1024 * 1024 * 1024;
        private const long MaxImageBytes = 4L * 1024 * 1024 * 1024;
        private const long MaxVideoBytes = 4L * 1024 * 1024 * 1024;

        public static Dictionary<string, string> Validate(
            UpdateUserApplicationFormRequest req,
            bool hasExistingZip)
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

            if (req.ZipFile == null && !hasExistingZip)
            {
                errors["zipFile"] = "Zip file is required";
            }
            else if (req.ZipFile != null)
            {
                if (!req.ZipFile.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    errors["zipFile"] = "Only .zip files are allowed";
                else if (req.ZipFile.Length > MaxZipBytes)
                    errors["zipFile"] = $"Zip file must be <= {MaxZipBytes / (1024L * 1024 * 1024)} GB";
            }

            var existingMediaIds = new List<string>();
            if (!string.IsNullOrWhiteSpace(req.ExistingMediaFileIds))
            {
                try
                {
                    existingMediaIds = JsonSerializer.Deserialize<List<string>>(req.ExistingMediaFileIds) ?? new();
                }
                catch {}
            }

            var newMedia = (req.Media ?? new List<IFormFile>()).Where(f => f != null && f.Length > 0).ToList();
            var totalMediaCount = existingMediaIds.Count + newMedia.Count;

            if (totalMediaCount > 6 && !errors.ContainsKey("media"))
                errors["media"] = "Max 6 media items allowed (5 images + 1 video)";

            foreach (var f in newMedia)
            {
                var detected = MediaTypeDetector.DetectContentType(f);

                if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                {
                    if (!errors.ContainsKey("media"))
                        errors["media"] = "GIF files are not allowed.";
                    continue;
                }

                if (!MediaTypeDetector.IsAllowedImage(detected) && !MediaTypeDetector.IsAllowedVideo(detected))
                {
                    if (!errors.ContainsKey("media"))
                        errors["media"] = "Media must be JPG/PNG/WebP images or MP4/WebM/MOV videos.";
                }
            }

            if (totalMediaCount > 0)
            {
                if (req.PresentationIndex < 0 || req.PresentationIndex >= totalMediaCount)
                    errors["presentationIndex"] = "Presentation index is invalid";
            }

            return errors;
        }
    }
}