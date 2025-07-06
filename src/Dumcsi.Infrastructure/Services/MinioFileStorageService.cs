using Dumcsi.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Minio;
using Minio.DataModel.Args;

namespace Dumcsi.Infrastructure.Services;

public class MinioFileStorageService : IFileStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly string _defaultBucketName;

    public MinioFileStorageService(IConfiguration configuration)
    {
        var minioConfig = configuration.GetSection("Minio");
        var endpoint = minioConfig["Endpoint"] ?? throw new InvalidOperationException("MinIO Endpoint is not configured.");
        var accessKey = minioConfig["AccessKey"] ?? throw new InvalidOperationException("MinIO AccessKey is not configured.");
        var secretKey = minioConfig["SecretKey"] ?? throw new InvalidOperationException("MinIO SecretKey is not configured.");
        _defaultBucketName = minioConfig["BucketName"] ?? "dumcsi";

        _minioClient = new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(accessKey, secretKey)
            .WithSSL(minioConfig.GetValue<bool>("UseSSL"))
            .Build();
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string bucketName = "dumcsi")
    {
        bucketName ??= _defaultBucketName;

        // Ellenőrizzük, hogy létezik-e a bucket, és ha nem, létrehozzuk
        var beArgs = new BucketExistsArgs().WithBucket(bucketName);
        bool found = await _minioClient.BucketExistsAsync(beArgs);
        if (!found)
        {
            var mbArgs = new MakeBucketArgs().WithBucket(bucketName);
            await _minioClient.MakeBucketAsync(mbArgs);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{fileName}";

        var putObjectArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(uniqueFileName)
            .WithStreamData(fileStream)
            .WithObjectSize(fileStream.Length)
            .WithContentType(contentType);
        
        await _minioClient.PutObjectAsync(putObjectArgs);

        // Visszaadjuk a fájl elérési útját/URL-jét
        return $"{_minioClient.Config.Endpoint}/{bucketName}/{uniqueFileName}";
    }

    public async Task DeleteFileAsync(string fileName, string bucketName = "dumcsi")
    {
        bucketName ??= _defaultBucketName;
        
        var rmArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(fileName);

        await _minioClient.RemoveObjectAsync(rmArgs);
    }
}