# Vi-Notes

Vi-Notes is a MERN-based authenticity verification prototype focused on **writing behavior signals**, not content storage.

This submission implements the requested 1-2 features end-to-end:
- Keystroke timing capture during typing
- Paste detection with pasted length tracking

## Implemented Features

### 1) Keystroke Timing Metadata
While the user types in the editor, the app captures:
- `interKeyMs`: time gap between consecutive key presses
- `holdMs`: key press to key release duration

### 2) Paste Detection Metadata
When user pastes into the editor, the app captures:
- `pasteLength`: number of characters pasted

### Live UI Visibility
The editor includes a **Live Activity** section showing:
- total event count
- keystroke timing event count
- paste event count
- latest event log (timing/paste only)

## Privacy-First Rules

This project intentionally does **not** store:
- typed characters
- pasted text
- clipboard content

Only behavioral metadata is stored (timestamps, timing values, paste length).

## Tech Stack

- Frontend: React (CRA)
- Backend: Node.js + Express
- Database: MongoDB + Mongoose

## Project Structure

- `frontend/` - React editor UI and telemetry event sender
- `backend/` - Express API, Mongoose models, MongoDB persistence

## API Endpoints

- `POST /api/sessions`  
  Create/reuse a writing session
- `POST /api/sessions/:sessionId/events`  
  Send one event at a time (`key` or `paste`)
- `POST /api/sessions/:sessionId/end`  
  Mark session as ended
- `GET /api/sessions/:sessionId`  
  Session summary and counts
- `GET /api/sessions/:sessionId/events?limit=200`  
  Read recent stored metadata events

## Sample Event Payloads

Keystroke keydown event:
```json
{
  "type": "key",
  "phase": "down",
  "ts": 1710000000000,
  "interKeyMs": 143,
  "isRepeat": false
}
```

Keystroke keyup event:
```json
{
  "type": "key",
  "phase": "up",
  "ts": 1710000000108,
  "holdMs": 91,
  "isRepeat": false
}
```

Paste event:
```json
{
  "type": "paste",
  "ts": 1710000000200,
  "pasteLength": 54
}
```

## Run Locally

1. Start MongoDB (local or Atlas URI).

2. Start backend:
```bash
cd backend
npm install
npm run dev
```

3. Start frontend:
```bash
cd frontend
npm install
npm start
```

4. Open:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/health`

## Quick Verification

1. Type in editor and observe Live Activity updates.
2. Paste text and confirm paste detection + character length is shown.
3. Check stored events with:
   - `GET /api/sessions/:sessionId/events`
4. Confirm no text fields are stored, only timing/length metadata.

## Viva / Demo Script (1 minute)

"In this Vi-Notes prototype, I implemented two behavioral authenticity features.  
First, while the user types, I record only timing metadata: inter-key delay and key hold duration.  
Second, when a paste occurs, I record only that a paste happened and how many characters were pasted.  
No typed or pasted content is stored anywhere.  
These events are sent in real time from React to Express and saved in MongoDB for later behavioral analysis.  
The Live Activity panel proves detections instantly to the user."

## License

This project is licensed under the MIT License.
