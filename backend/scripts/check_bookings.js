const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in backend/.env');
  process.exit(1);
}

// Define Schema matching the backend models
const bookingSchema = new mongoose.Schema({}, { strict: false });
const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB successfully.');

    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    console.log(`\nFound ${bookings.length} Bookings in Database:`);
    bookings.forEach((b) => {
      console.log(`- ID: ${b.bookingId || b._id} | Status: ${b.bookingStatus} | Payment: ${b.paymentStatus} | Outfit: ${b.outfit} | Dates: ${b.startDate ? b.startDate.toISOString().split('T')[0] : 'N/A'} to ${b.endDate ? b.endDate.toISOString().split('T')[0] : 'N/A'}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

run();
