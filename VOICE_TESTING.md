# Voice Chat Testing Guide

## Setup

### Terminal 1 - Backend
```bash
cd server
go run cmd/main.go
```

### Terminal 2 - Frontend
```bash
cd client
bun run dev
```

Open: http://localhost:1420

## Testing Scenarios

### Test 1: Two Users (Basic)
1. Open http://localhost:1420 in **Chrome** (Window 1)
2. Login as "Alice"
3. Open http://localhost:1420 in **Firefox** or **Incognito Chrome** (Window 2)
4. Login as "Bob"
5. Click "Join Voice" in both windows
6. You should hear echo/feedback (this proves it works!)
7. Try muting in one window - feedback should stop

### Test 2: Multiple Users (3-5)
1. Open 3-5 browser windows (mix of regular/incognito/different browsers)
2. Login with different usernames
3. All users join voice channel
4. Test talking - everyone should hear everyone
5. Test mute button - muted user's audio should stop transmitting

### Test 3: Join/Leave Flow
1. User A joins voice
2. User B joins voice - should connect to User A
3. User C joins voice - should connect to both A and B
4. User A leaves - B and C should still hear each other
5. User A rejoins - should reconnect to B and C

## What to Check

### Visual Indicators
- ✓ Green pulsing dot next to users in voice
- ✓ Speaker icon (🔊) when unmuted
- ✓ Mute icon (🔇) when muted
- ✓ "Join Voice" button turns to "Mute" + "Leave Voice" when in channel

### Audio Quality
- ✓ Clear audio (no distortion)
- ✓ Low latency (<100ms for local network, check console for P2P connection)
- ✓ No echo when muted
- ✓ Echo cancellation working (browser's built-in)

### Browser Console
Press F12 and check console for:
- `WebSocket connected`
- `Received stream from <username>`
- `Connected to <username>`
- No red errors

## Troubleshooting

### Issue: No audio from other user
**Check:**
1. Microphone permission granted? (browser should prompt)
2. Console shows "Received stream from X"?
3. Console shows "Connected to X"?
4. Try refreshing both windows

### Issue: Connection stuck at "Joining..."
**Check:**
1. Backend server running?
2. Console errors?
3. Try different browser
4. Check microphone permissions in browser settings

### Issue: Echo/feedback
**Expected** when testing on same machine with 2 windows.
**Solution for testing:** 
- Mute one window
- Or use headphones
- Or test on different devices

### Issue: One-way audio (A hears B, but B doesn't hear A)
**Check:**
1. Both users granted microphone permission?
2. Both clicked "Join Voice"?
3. Check console for peer connection errors
4. Try refreshing both windows

## Network Testing

### Same Device (Localhost)
- Expected latency: <50ms
- Will hear echo (normal)

### Same WiFi Network
- Expected latency: 10-40ms
- Test with 2 laptops/phones on same WiFi

### Different Networks (Real World)
- Expected latency: 20-100ms (India to India)
- Test with friends on different internet connections
- This is the real test for your use case!

## Latency Measurement

Check browser console for WebRTC stats:
```javascript
// Open console and run this on one user's window:
webrtcManager.peers.forEach((peer, username) => {
  peer.peer.getStats((err, stats) => {
    console.log(`Stats for ${username}:`, stats);
  });
});
```

Look for `currentRoundTripTime` in stats - this is your latency in seconds (multiply by 1000 for ms).

## Success Criteria

✅ **MVP Complete:**
- Multiple users can join voice
- Audio is clear and low latency
- Mute button works
- Visual indicators show voice status
- No browser crashes or connection issues

✅ **Ready for Real Testing:**
- Works across different browsers
- Works on same WiFi
- Ready to test with friends on different networks in India

## Next Steps After Testing

1. If voice works well → Move to database + auth + server/channel structure
2. If latency is high → Investigate (may need TURN server or better network)
3. If connections fail → Debug ICE candidates / firewall issues
