using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestPlatform.TestHost;
using Xunit.Abstractions;

namespace Dumcsi.Tests.Integration;

public class DiscordApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;
    private string? _jwtToken;
    private long _serverId;
    private long _channelId;
    private long _messageId;

    public DiscordApiIntegrationTests(WebApplicationFactory<Program> factory, ITestOutputHelper output)
    {
        _output = output;
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
        });
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task FullWorkflow_ShouldWork()
    {
        await Test01_RegisterUser();
        await Test02_LoginUser();
        await Test03_CreateServer();
        await Test04_GetServers();
        await Test05_GetServerDetails();
        await Test06_GetServerChannels();
        await Test07_CreateChannel();
        await Test08_GetChannelDetails();
        await Test09_SendMessage();
        await Test10_GetMessages();
        await Test11_EditMessage();
        await Test12_GetSpecificMessage();
        await Test13_ServerMembers();
        await Test14_GenerateInvite();
        await Test15_DeleteMessage();
        await Test16_DeleteChannel();
        await Test17_DeleteServer();
        
        _output.WriteLine("🎉 All tests passed! Complete Discord API workflow works!");
    }

    private async Task Test01_RegisterUser()
    {
        _output.WriteLine("1️⃣ Testing User Registration...");
        
        var registerRequest = new
        {
            Username = "testuser",
            Password = "password123",
            Email = "test@example.com"
        };

        var response = await PostAsync("/api/auth/register", registerRequest);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        _output.WriteLine("✅ User registration successful");
    }

    private async Task Test02_LoginUser()
    {
        _output.WriteLine("2️⃣ Testing User Login...");
        
        var loginRequest = new
        {
            UsernameOrEmail = "testuser",
            Password = "password123"
        };

        var response = await PostAsync("/api/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        _jwtToken = responseContent.Trim('"'); // Remove quotes
        
        // Set authorization header for future requests
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _jwtToken);
        
        _output.WriteLine($"✅ Login successful. JWT: {_jwtToken[..50]}...");
    }

    private async Task Test03_CreateServer()
    {
        _output.WriteLine("3️⃣ Testing Server Creation...");
        
        var createServerRequest = new
        {
            Name = "Test Server",
            Description = "A test server for integration tests",
            IsPublic = false
        };

        var response = await PostAsync("/api/server", createServerRequest);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var serverResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
        _serverId = serverResponse.GetProperty("serverId").GetInt64();
        
        _output.WriteLine($"✅ Server created with ID: {_serverId}");
    }

    private async Task Test04_GetServers()
    {
        _output.WriteLine("4️⃣ Testing Get Servers...");
        
        var response = await _client.GetAsync("/api/server");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var servers = JsonSerializer.Deserialize<JsonElement[]>(responseContent);
        
        Assert.NotNull(servers);
        Assert.True(servers.Length > 0);
        Assert.Equal(_serverId, servers[0].GetProperty("id").GetInt64());
        Assert.Equal("Test Server", servers[0].GetProperty("name").GetString());
        
        _output.WriteLine($"✅ Found {servers.Length} server(s)");
    }

    private async Task Test05_GetServerDetails()
    {
        _output.WriteLine("5️⃣ Testing Get Server Details...");
        
        var response = await _client.GetAsync($"/api/server/{_serverId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var server = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal(_serverId, server.GetProperty("id").GetInt64());
        Assert.True(server.GetProperty("isOwner").GetBoolean());
        Assert.True(server.GetProperty("channels").GetArrayLength() > 0); // Default "general" channel
        
        _channelId = server.GetProperty("channels")[0].GetProperty("id").GetInt64();
        
        _output.WriteLine($"✅ Server details retrieved. Default channel ID: {_channelId}");
    }

    private async Task Test06_GetServerChannels()
    {
        _output.WriteLine("6️⃣ Testing Get Server Channels...");
        
        var response = await _client.GetAsync($"/api/server/{_serverId}/channels");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var channels = JsonSerializer.Deserialize<JsonElement[]>(responseContent);
        
        Assert.NotNull(channels);
        Assert.True(channels.Length > 0);
        Assert.Equal("general", channels[0].GetProperty("name").GetString());
        
        _output.WriteLine($"✅ Found {channels.Length} channel(s)");
    }

    private async Task Test07_CreateChannel()
    {
        _output.WriteLine("7️⃣ Testing Create Channel...");
        
        var createChannelRequest = new
        {
            Name = "test-channel",
            Description = "A test channel",
            Type = 0 // ChannelType.Text
        };

        var response = await PostAsync($"/api/server/{_serverId}/channels", createChannelRequest);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var channel = JsonSerializer.Deserialize<JsonElement>(responseContent);
        var newChannelId = channel.GetProperty("id").GetInt64();
        
        _output.WriteLine($"✅ Channel created with ID: {newChannelId}");
    }

    private async Task Test08_GetChannelDetails()
    {
        _output.WriteLine("8️⃣ Testing Get Channel Details...");
        
        var response = await _client.GetAsync($"/api/channels/{_channelId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var channel = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal(_channelId, channel.GetProperty("id").GetInt64());
        Assert.Equal("general", channel.GetProperty("name").GetString());
        
        _output.WriteLine("✅ Channel details retrieved");
    }

    private async Task Test09_SendMessage()
    {
        _output.WriteLine("9️⃣ Testing Send Message...");
        
        var sendMessageRequest = new
        {
            Content = "Hello, World! This is a test message."
        };

        var response = await PostAsync($"/api/channels/{_channelId}/messages", sendMessageRequest);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var message = JsonSerializer.Deserialize<JsonElement>(responseContent);
        _messageId = message.GetProperty("id").GetInt64();
        
        _output.WriteLine($"✅ Message sent with ID: {_messageId}");
    }

    private async Task Test10_GetMessages()
    {
        _output.WriteLine("🔟 Testing Get Messages...");
        
        var response = await _client.GetAsync($"/api/channels/{_channelId}/messages");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var messages = JsonSerializer.Deserialize<JsonElement[]>(responseContent);
        
        Assert.NotNull(messages);
        Assert.True(messages.Length > 0);
        Assert.Equal("Hello, World! This is a test message.", messages[0].GetProperty("content").GetString());
        
        _output.WriteLine($"✅ Found {messages.Length} message(s)");
    }

    private async Task Test11_EditMessage()
    {
        _output.WriteLine("1️⃣1️⃣ Testing Edit Message...");
        
        var editMessageRequest = new
        {
            Content = "Hello, World! This message has been edited."
        };

        var response = await PatchAsync($"/api/channels/{_channelId}/messages/{_messageId}", editMessageRequest);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        
        _output.WriteLine("✅ Message edited successfully");
    }

    private async Task Test12_GetSpecificMessage()
    {
        _output.WriteLine("1️⃣2️⃣ Testing Get Specific Message...");
        
        var response = await _client.GetAsync($"/api/channels/{_channelId}/messages/{_messageId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var message = JsonSerializer.Deserialize<JsonElement>(responseContent);
        
        Assert.Equal("Hello, World! This message has been edited.", message.GetProperty("content").GetString());
        Assert.True(message.GetProperty("isEdited").GetBoolean());
        
        _output.WriteLine("✅ Specific message retrieved and edit confirmed");
    }

    private async Task Test13_ServerMembers()
    {
        _output.WriteLine("1️⃣3️⃣ Testing Get Server Members...");
        
        var response = await _client.GetAsync($"/api/server/{_serverId}/members");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var members = JsonSerializer.Deserialize<JsonElement[]>(responseContent);
        
        Assert.NotNull(members);
        Assert.Single(members); // Only the test user
        Assert.Equal("testuser", members[0].GetProperty("username").GetString());
        Assert.Equal(2, members[0].GetProperty("role").GetInt32()); // Role.Admin = 2
        
        _output.WriteLine($"✅ Found {members.Length} member(s)");
    }

    private async Task Test14_GenerateInvite()
    {
        _output.WriteLine("1️⃣4️⃣ Testing Generate Invite...");
        
        var response = await _client.PostAsync($"/api/server/{_serverId}/invite", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var responseContent = await response.Content.ReadAsStringAsync();
        var inviteResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
        var inviteCode = inviteResponse.GetProperty("inviteCode").GetString();
        
        Assert.NotNull(inviteCode);
        Assert.Equal(8, inviteCode.Length);
        
        _output.WriteLine($"✅ Invite code generated: {inviteCode}");
    }

    private async Task Test15_DeleteMessage()
    {
        _output.WriteLine("1️⃣5️⃣ Testing Delete Message...");
        
        var response = await _client.DeleteAsync($"/api/channels/{_channelId}/messages/{_messageId}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        
        _output.WriteLine("✅ Message deleted successfully");
    }

    private async Task Test16_DeleteChannel()
    {
        _output.WriteLine("1️⃣6️⃣ Testing Delete Channel...");
        
        var response = await _client.DeleteAsync($"/api/channels/{_channelId}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        
        _output.WriteLine("✅ Channel deleted successfully");
    }

    private async Task Test17_DeleteServer()
    {
        _output.WriteLine("1️⃣7️⃣ Testing Delete Server...");
        
        var response = await _client.DeleteAsync($"/api/server/{_serverId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        _output.WriteLine("✅ Server deleted successfully");
    }

    // Helper methods
    private async Task<HttpResponseMessage> PostAsync<T>(string url, T data)
    {
        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        return await _client.PostAsync(url, content);
    }

    private async Task<HttpResponseMessage> PatchAsync<T>(string url, T data)
    {
        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        return await _client.PatchAsync(url, content);
    }
    
    private void CleanupTestDatabase()
    {
        try
        {
            using var scope = _factory.Services.CreateScope();
            var dbContextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<DumcsiDbContext>>();
            using var dbContext = dbContextFactory.CreateDbContext();
            
            dbContext.Database.EnsureDeleted();
            dbContext.Database.EnsureCreated();
            
            _output.WriteLine("🧹 Test database cleaned up");
        }
        catch (Exception ex)
        {
            _output.WriteLine($"⚠️ Database cleanup failed: {ex.Message}");
        }
    }

    public void Dispose()
    {
        CleanupTestDatabase();
        
        _client?.Dispose();
        _factory?.Dispose();
    }
}

// Simple unit tests for edge cases
public class AuthControllerTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Register_InvalidEmail_ShouldReturnBadRequest()
    {
        var request = new
        {
            Username = "testuser2",
            Password = "password123",
            Email = "invalid-email"
        };

        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/auth/register", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_InvalidCredentials_ShouldReturnUnauthorized()
    {
        var request = new
        {
            UsernameOrEmail = "nonexistent",
            Password = "wrongpassword"
        };

        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/auth/login", content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}