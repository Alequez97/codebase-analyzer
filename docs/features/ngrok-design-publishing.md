# Ngrok Design Publishing

## Overview

The Design Studio now includes **one-click public sharing** via ngrok tunnels. This allows you to instantly share design previews with anyone on the internet without deploying to a server.

## Features

- 🌐 **One-click publish** - Turn local designs into public URLs
- 🔗 **Instant sharing** - Share design previews with anyone
- 🚀 **No deployment needed** - Works directly from your local machine
- 🔒 **Easy unpublish** - Close the tunnel when you're done
- 🎨 **Beautiful UI** - Purple publish button with external link icon

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (DesignPreviewPane)               │
│  - Publish/Unpublish buttons                │
│  - External link to open public URL         │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│  Backend (design routes)                    │
│  POST   /api/design/publish/:designId       │
│  DELETE /api/design/publish/:designId       │
│  GET    /api/design/publish/:designId       │
└──────────────────┬──────────────────────────┘
                   │ Uses
┌──────────────────▼──────────────────────────┐
│  NgrokManager (utils/ngrok-manager.js)      │
│  - Manages tunnel lifecycle                 │
│  - Tracks active tunnels per design         │
│  - Automatic cleanup on shutdown            │
└──────────────────┬──────────────────────────┘
                   │ Spawns
┌──────────────────▼──────────────────────────┐
│  Ngrok Tunnel                               │
│  Local: http://localhost:3001               │
│  Public: https://abc123.ngrok.io            │
└─────────────────────────────────────────────┘
```

### Flow

1. User clicks **"Publish"** button in Design Studio
2. Frontend calls `POST /api/design/publish/:designId`
3. Backend spawns ngrok tunnel via `@ngrok/ngrok` package
4. Ngrok tunnel points to `/design-preview/:designId`
5. Public URL is returned and stored in Zustand
6. User can click the external link icon to open public URL
7. User clicks **"Unpublish"** to close the tunnel

## Setup

### 1. Install Dependencies

Already installed! The `@ngrok/ngrok` package is included.

### 2. **REQUIRED**: Configure Ngrok Auth Token

⚠️ **Ngrok now requires authentication even for free usage.**

**Quick Setup:**

1. **Sign up** for a free ngrok account: [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. **Get your auth token**: [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. **Add to `backend/.env`**:

```env
NGROK_AUTHTOKEN=your_token_here
```

4. **Restart the backend** if it's already running

**Example `.env` file:**

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
NGROK_AUTHTOKEN=2mZx...your_token_here
```

The manager will automatically use `NGROK_AUTHTOKEN` from environment variables.

### Benefits of Free Ngrok Account

- ✅ Unlimited tunnels (within rate limits)
- ✅ No time limits
- ✅ Better tunnel management
- ✅ Connection analytics
- ✅ 1 online endpoint at a time (free tier)

For paid plans:

- Multiple concurrent tunnels
- Custom domains
- Static URLs
- Reserved subdomains

## Usage

### From the UI

1. **Start the app** and generate a design in Design Studio
2. **Click "Publish"** button (purple globe icon) next to Preview/Logs tabs
3. **Wait** for the tunnel to spin up (~2-3 seconds)
4. **Copy the URL** or click the external link icon to open in a new tab
5. **Share the URL** with anyone - no login required!
6. **Click "Unpublish"** when done to close the tunnel

### Button States

- **Not Published**: Gray outline button with Globe icon
- **Publishing...**: Shows spinner, disabled
- **Published**: Purple solid button with X icon + external link icon
- **Unpublishing...**: Shows spinner

### Programmatic Usage

```javascript
// Publish a design
const result = await publishDesign("v1");
console.log(result.url); // https://abc123.ngrok.io/design-preview/v1

// Check if published
const status = await getPublishStatus("v1");
console.log(status.isPublished); // true
console.log(status.url); // https://abc123.ngrok.io/design-preview/v1

// Unpublish
await unpublishDesign("v1");
```

## API Endpoints

### POST `/api/design/publish/:designId`

Starts an ngrok tunnel for the specified design.

**Response:**

```json
{
  "success": true,
  "designId": "v1",
  "url": "https://abc123.ngrok.io/design-preview/v1"
}
```

### DELETE `/api/design/publish/:designId`

Stops the ngrok tunnel for the specified design.

**Response:**

```json
{
  "success": true,
  "designId": "v1"
}
```

### GET `/api/design/publish/:designId`

Checks if a design is currently published.

**Response:**

```json
{
  "designId": "v1",
  "url": "https://abc123.ngrok.io/design-preview/v1",
  "isPublished": true
}
```

## State Management

### Zustand Store (`useDesignStudioStore`)

New state properties:

```javascript
{
  publishedUrl: null,        // The public ngrok URL or null
  isPublishing: false,       // Loading state for publish/unpublish
  publishError: null,        // Error message if publish fails

  // Actions
  publishDesign(designId),   // Start tunnel
  unpublishDesign(designId), // Stop tunnel
  checkPublishStatus(designId) // Check if published
}
```

## Error Handling

### Common Errors

**"Failed to start ngrok tunnel: connect ECONNREFUSED"**

- Ngrok service might be blocked by firewall
- Try running with admin/sudo permissions

**"Failed to start ngrok tunnel: authentication failed"**

- Invalid `NGROK_AUTHTOKEN` in `.env`
- Remove the token to use free tier without auth

**"Tunnel not found"**

- Tunnel was already closed or never started
- Safe to ignore, just indicates nothing to unpublish

### Automatic Cleanup

Tunnels are automatically closed when:

- User clicks "Unpublish"
- Backend process exits (SIGINT/SIGTERM)
- Application crashes (process cleanup)

## Limitations

### Free Account (Required)

- 1 online endpoint at a time
- 40 connections/minute (rate limited)
- Unlimited sessions
- No custom domains

### Paid Plans

- Multiple concurrent tunnels
- Custom domains
- Static URLs
- Reserved subdomains
- Higher rate limits
- More bandwidth

## Security Considerations

⚠️ **Important:**

- Published designs are **publicly accessible** to anyone with the URL
- Don't publish designs with sensitive data
- Remember to unpublish when done
- Ngrok URLs are semi-random but not secret - anyone who discovers the URL can access it

## Troubleshooting

### Tunnel won't start

1. Check if ngrok is blocked by firewall
2. Verify backend is running on the correct port
3. Check backend logs for detailed error messages

### Tunnel closes immediately

1. Check for ngrok account issues
2. Verify `NGROK_AUTHTOKEN` is valid (if set)
3. Check ngrok dashboard for active tunnels

### Can't access public URL

1. Verify backend is actually running
2. Check if the design exists at `/design-preview/:designId`
3. Try accessing locally first: `http://localhost:3001/design-preview/v1`

## Future Enhancements

Potential improvements:

- [ ] Custom subdomain support (requires paid ngrok plan)
- [ ] Password protection on public URLs
- [ ] QR code generation for mobile sharing
- [ ] Share button that copies URL to clipboard
- [ ] Track view analytics (who accessed the design)
- [ ] Custom preview expiration times
- [ ] Batch publish/unpublish for multiple designs

## Technical Details

### Files Modified

**Backend:**

- `backend/utils/ngrok-manager.js` - New singleton manager
- `backend/routes/design.js` - Added 3 new endpoints
- `backend/package.json` - Added `@ngrok/ngrok` dependency

**Frontend:**

- `frontend/src/store/useDesignStudioStore.js` - Added ngrok state
- `frontend/src/api/design.js` - Added 3 new API methods
- `frontend/src/components/design-studio/DesignPreviewPane.jsx` - Added UI buttons
- `frontend/src/pages/DesignPage.jsx` - Passed props to component

### Dependencies

- `@ngrok/ngrok` - Official ngrok Node.js SDK
- Uses existing backend port (from `config.port`)
- Integrates with existing design preview system

---

**Ready to share your designs with the world? Click that purple Publish button!** 🚀
