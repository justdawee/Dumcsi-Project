# Dumcsi Frontend

A modern chat application frontend built with Vue 3, Vite, and Tailwind CSS.

## Features

- 🔐 JWT-based authentication
- 💬 Real-time messaging (WebSocket support ready)
- 🏢 Server and channel management
- 👥 User roles and permissions
- 🎨 Modern, responsive UI with Tailwind CSS
- 🌙 Dark theme by default
- ⚡ Fast development with Vite

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on http://localhost:5230

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dumcsi-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5173

## Project Structure

```
src/
├── components/       # Reusable Vue components
│   ├── auth/        # Authentication components
│   ├── channel/     # Channel-related components
│   ├── message/     # Message components
│   ├── server/      # Server components
│   └── ui/          # Generic UI components
├── views/           # Page components
├── stores/          # Pinia stores
├── services/        # API services
├── router/          # Vue Router configuration
├── composables/     # Vue composables
├── utils/           # Utility functions
└── style.css        # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Configuration

### Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:5230/api)

### Tailwind Configuration

The project uses a custom color scheme inspired by Discord but with its own unique palette:
- Primary: Purple (#7c3aed)
- Secondary: Gray (#4b5563)
- Accent: Green (#10b981)
- Danger: Red (#ef4444)

## Key Features Implementation

### Authentication
- Login/Register forms with validation
- JWT token storage in localStorage
- Automatic token injection in API requests
- Protected routes with navigation guards

### Server Management
- Create new servers
- Join servers with invite codes
- Server member list
- Role-based permissions

### Channel Features
- Text and voice channel types
- Channel creation (moderators/admins only)
- Channel navigation

### Messaging
- Send and receive messages
- Edit own messages
- Delete messages
- Message pagination
- Auto-scroll to bottom

## API Integration

The frontend expects the following API endpoints:

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`

### Servers
- GET `/api/server`
- POST `/api/server`
- GET `/api/server/{id}`
- DELETE `/api/server/{id}`
- GET `/api/server/{id}/members`
- POST `/api/server/{id}/join`
- POST `/api/server/{id}/leave`
- POST `/api/server/{id}/invite`
- GET `/api/server/{id}/channels`
- POST `/api/server/{id}/channels`

### Channels
- GET `/api/channels/{id}`
- PATCH `/api/channels/{id}`
- DELETE `/api/channels/{id}`

### Messages
- POST `/api/channels/{id}/messages`
- GET `/api/channels/{id}/messages`
- GET `/api/channels/{id}/messages/{messageId}`
- PATCH `/api/channels/{id}/messages/{messageId}`
- DELETE `/api/channels/{id}/messages/{messageId}`

## Future Enhancements

- [ ] WebSocket integration for real-time updates
- [ ] File uploads and attachments
- [ ] Voice channel support
- [ ] User presence indicators
- [ ] Direct messaging
- [ ] Message reactions
- [ ] User profile customization
- [ ] Server discovery
- [ ] Message search
- [ ] Notification system

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.