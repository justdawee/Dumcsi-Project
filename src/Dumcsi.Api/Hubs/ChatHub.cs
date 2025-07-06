using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace Dumcsi.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    // Amikor egy kliens csatlakozik egy csatornához
    public async Task JoinChannel(string channelId)
    {
        // A klienst hozzáadjuk egy "csoporthoz", ami az adott csatornát képviseli.
        // Így könnyen tudunk csak az adott csatornán lévőknek üzenetet küldeni.
        await Groups.AddToGroupAsync(Context.ConnectionId, channelId);
    }

    // Amikor egy kliens elhagy egy csatornát
    public async Task LeaveChannel(string channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channelId);
    }
}