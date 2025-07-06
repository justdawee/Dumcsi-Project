using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Dumcsi.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    // Memóriában tároljuk, hogy melyik csatornában (string) kik vannak (ConnectionId lista)
    // TODO: Redis cache használata a jobb teljesítmény érdekében, ha nagyobb terhelés várható
    private static readonly ConcurrentDictionary<string, List<string>> VoiceChannelUsers = new();

    // --- Text Chat Metódusok ---
    public async Task JoinChannel(string channelId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, channelId);
    }

    public async Task LeaveChannel(string channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channelId);
    }
    
    // --- Voice Chat Metódusok ---

    public async Task JoinVoiceChannel(string channelId)
    {
        var connectionId = Context.ConnectionId;

        // Tájékoztatjuk a már bent lévőket, hogy egy új user csatlakozott
        // Az új usernek majd mindegyikükkel kapcsolatot kell létesítenie
        if (VoiceChannelUsers.TryGetValue(channelId, out var usersInChannel))
        {
            // Elküldjük a csatornában lévő összes user connectionId-ját az új csatlakozónak
            await Clients.Client(connectionId).SendAsync("AllUsersInChannel", usersInChannel);
        }

        // Hozzáadjuk az új felhasználót a listához
        var updatedUsers = VoiceChannelUsers.AddOrUpdate(channelId, 
            new List<string> { connectionId }, 
            (key, existingList) => {
                existingList.Add(connectionId);
                return existingList;
            });
            
        // Értesítjük a többieket az új felhasználó érkezéséről
        await Clients.OthersInGroup(channelId).SendAsync("UserJoinedVoice", connectionId);
    }
    
    public async Task LeaveVoiceChannel(string channelId)
    {
        if (VoiceChannelUsers.TryGetValue(channelId, out var users))
        {
            users.Remove(Context.ConnectionId);
            if (users.Count == 0)
            {
                VoiceChannelUsers.TryRemove(channelId, out _);
            }
        }
        
        await Clients.OthersInGroup(channelId).SendAsync("UserLeftVoice", Context.ConnectionId);
    }

    // --- WebRTC kapcsolatok kezelése ---
    public async Task SendOffer(string targetConnectionId, object offer)
    {
        // Az offer-t továbbítjuk a cél kliensnek, mellékelve a küldő ConnectionId-ját
        await Clients.Client(targetConnectionId).SendAsync("ReceiveOffer", Context.ConnectionId, offer);
    }

    public async Task SendAnswer(string targetConnectionId, object answer)
    {
        // A választ továbbítjuk az eredeti ajánlatot küldő kliensnek
        await Clients.Client(targetConnectionId).SendAsync("ReceiveAnswer", Context.ConnectionId, answer);
    }

    public async Task SendIceCandidate(string targetConnectionId, object iceCandidate)
    {
        // Az ICE candidate-et továbbítjuk a másik kliensnek
        await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, iceCandidate);
    }
    
    // --- Képernyőmegosztás kezelése ---
    public async Task StartScreenShare(string channelId)
    {
        // Értesítjük a csatorna csoportjában lévő többi felhasználót,
        // hogy ez a connectionId (Context.ConnectionId) megosztja a képernyőjét.
        // A kliensek ezután tudnak majd kapcsolódási ajánlatot (offer) küldeni neki.
        await Clients.OthersInGroup(channelId).SendAsync("UserStartedScreenShare", Context.ConnectionId);
    }
    
    public async Task StopScreenShare(string channelId)
    {
        // Értesítjük a többieket, hogy a képernyőmegosztás véget ért,
        // így lebonthatják a kapcsolódó P2P kapcsolatot.
        await Clients.OthersInGroup(channelId).SendAsync("UserStoppedScreenShare", Context.ConnectionId);
    }
}