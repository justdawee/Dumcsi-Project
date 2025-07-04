namespace Dumcsi.Domain.Enums;

[Flags]
public enum Permission : long // long típust használunk, hogy több mint 32 jogosultságunk lehessen
{
    None = 0,

    // Általános Szerver Jogosultságok
    ViewChannels = 1L << 0,       // Csatornák megtekintése
    ManageChannels = 1L << 1,      // Csatornák létrehozása, szerkesztése, törlése
    ManageRoles = 1L << 2,         // Szerepkörök kezelése
    ManageEmojis = 1L << 3,        // Emojik és matricák kezelése
    ViewAuditLog = 1L << 4,        // Audit napló megtekintése
    ManageServer = 1L << 5,        // Szerver nevének, régiójának stb. módosítása
    
    // Tagsággal kapcsolatos Jogosultságok
    CreateInvite = 1L << 6,        // Meghívó létrehozása
    KickMembers = 1L << 7,         // Tagok kirúgása
    BanMembers = 1L << 8,          // Tagok kitiltása
    
    // Üzenetküldéssel kapcsolatos Jogosultságok
    SendMessages = 1L << 9,        // Üzenetek küldése
    EmbedLinks = 1L << 10,         // Linkek beágyazása
    AttachFiles = 1L << 11,        // Fájlok csatolása
    AddReactions = 1L << 12,       // Reakciók hozzáadása
    UseExternalEmojis = 1L << 13, // Külső emojik használata
    MentionEveryone = 1L << 14,    // @everyone, @here és Minden Szerepkör megemlítése
    ManageMessages = 1L << 15,     // Mások üzeneteinek törlése
    ReadMessageHistory = 1L << 16, // Üzenetelőzmények olvasása

    // Hangcsatorna Jogosultságok
    Connect = 1L << 17,            // Csatlakozás hangcsatornához
    Speak = 1L << 18,              // Beszéd hangcsatornán
    MuteMembers = 1L << 19,        // Tagok némítása
    DeafenMembers = 1L << 20,      // Tagok süketítése
    MoveMembers = 1L << 21,        // Tagok mozgatása csatornák között

    // Adminisztrátori Jogosultság
    Administrator = 1L << 22       // Minden jogosultságot megad és felülbírálja a csatorna-specifikusakat
}