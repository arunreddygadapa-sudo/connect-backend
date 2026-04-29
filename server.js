const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose'); // The new MongoDB translator

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://arunreddygadapa_db_user:gb0rtfBbfuSiiI7q@connectcluster.w5stg07.mongodb.net/?appName=ConnectCluster";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Connected to MongoDB Cloud!"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// --- DATABASE SCHEMA (The Memory Structure) ---
const RideSchema = new mongoose.Schema({
    fare: Number,
    distance: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'requested' }
});
const Ride = mongoose.model('Ride', RideSchema);

// --- ROUTES ---
app.post('/api/ride/request', async (req, res) => {
    const { distanceKm } = req.body;
    const fare = Math.round(distanceKm * 15 + 50);

    try {
        // Save the new ride to the cloud database!
        const newRide = new Ride({ fare, distance: distanceKm.toFixed(1) });
        await newRide.save();
        console.log("💾 Ride saved to database!");

        res.json({
            estimatedFare: fare,
            rideClass: "CONNECT PREMIUM",
            rideId: newRide._id
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to save ride" });
    }
});

// --- SOCKETS ---
io.on('connection', (socket) => {
    console.log(`📱 A device connected: ${socket.id}`);

    socket.on('driver_online', () => {
        console.log("🚕 Driver is online and waiting...");
    });

    socket.on('passenger_request_ride', (data) => {
        console.log("🚨 NEW RIDE REQUESTED:", data);
        io.emit('incoming_ride_offer', data);
    });

    socket.on('driver_location_update', (coords) => {
        io.emit('live_tracking_update', coords);
    });

    socket.on('disconnect', () => {
        console.log("❌ Device disconnected");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});
