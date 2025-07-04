namespace Dumcsi.Application.DTOs;

/// <summary>
/// A sikeres bejelentkezés vagy token frissítés válaszát tartalmazza.
/// </summary>
public class TokenResponseDto
{
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
}

/// <summary>
/// Egy művelet eredményét reprezentálja, ami hibát is tartalmazhat.
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public bool IsFailure => !IsSuccess;

    protected Result(bool isSuccess, string? error)
    {
        if (isSuccess && error != null)
            throw new InvalidOperationException();
        if (!isSuccess && error == null)
            throw new InvalidOperationException();
            
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, null);
    public static Result Failure(string error) => new(false, error);

    public static Result<T> Success<T>(T value) => new(value, true, null);
    public static Result<T> Failure<T>(string error) => new(default, false, error);
}

/// <summary>
/// Egy művelet eredményét reprezentálja, ami sikeres esetben értéket is visszaad.
/// </summary>
public class Result<T> : Result
{
    public T? Value { get; }

    protected internal Result(T? value, bool isSuccess, string? error)
        : base(isSuccess, error)
    {
        Value = value;
    }
}