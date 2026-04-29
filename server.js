const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Unlocks the API for Chrome!

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.json());

// We are keeping your old pricing API alive so the Passenger app can still calculate prices
app.post('/api/ride/request', (req, res) => {
    const { distanceKm } = req.body;
    let baseFare = 50;
    let perKmRate = 18;
    let finalFare = Math.round((baseFare + (distanceKm * perKmRate)) * 1.2);

    res.json({
        message: "API Price Calculated",
        estimatedFare: finalFare,
        rideClass: "CONNECT Premium"
    });
});

// --- THE NEW MAGIC: REAL-TIME WEBSOCKETS ---
io.on('connection', (socket) => {
    console.log('📱 A new device connected! ID:', socket.id);

    // 1. Listen for when a Driver goes online
    socket.on('driver_online', () => {
        console.log('🚕 A CONNECT Driver went ONLINE.');
    });

    // 2. Listen for when a Passenger confirms a ride
    socket.on('passenger_request_ride', (rideData) => {
        console.log(`🚨 NEW RIDE! Passenger requesting ${rideData.distance}km trip for ₹${rideData.fare}`);
        
        // INSTANTLY broadcast this exact ride to all connected Drivers
        socket.broadcast.emit('incoming_ride_offer', rideData);
    });

    // 3. Listen for live GPS updates from the Driver and broadcast them
    socket.on('driver_location_update', (locationData) => {
        console.log('📍 Driver moved:', locationData);
        
        // Forward the exact coordinates to the Passenger App
        socket.broadcast.emit('live_tracking_update', locationData);
    });

    socket.on('disconnect', () => {
        console.log('❌ Device disconnected:', socket.id);
    });
});

// --- CLOUD DEPLOYMENT UPGRADE ---
// Use the cloud provider's port, or default to 3000 if running locally
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 CONNECT Real-Time Server running on port ${PORT}`);
});