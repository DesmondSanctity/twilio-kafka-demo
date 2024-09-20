import express from 'express';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import twilio from 'twilio';
import mongoose from 'mongoose';
import Transaction from './model.js';

dotenv.config();

const app = express();
app.use(express.json());

// Kafka consumer configuration
const kafka = new Kafka({
 clientId: 'app-consumer',
 brokers: ['kafka:29092'],
});

const consumer = kafka.consumer({
 groupId: 'transactions-group',
 retry: {
  retries: 8, // Increase the number of retries
 },
 requestTimeout: 60000, // Increase the request timeout
});

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(accountSid, authToken);

// MongoDB configuration
const mongoUrl = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

// Mongoose connection to MongoDB
mongoose
 .connect(`${mongoUrl}/${dbName}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
 })
 .then(() => console.log('Connected to MongoDB'))
 .catch((err) => console.error('MongoDB connection error:', err));

// Add health check route
app.get('/health', (req, res) => {
 res.status(200).json({ status: 'OK', message: 'Consumer service is healthy' });
});

// Function to send SMS alert via Twilio
const sendAlert = async (transaction) => {
 const message = `Alert: A transaction of $${transaction.amount} has been made at ${transaction.location}.`;
 await twilioClient.messages
  .create({
   body: message,
   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
   to: `whatsapp:${process.env.ALERT_WHATSAPP_NUMBER}`,
  })
  .then((message) => console.log('Alert sent:', message.sid))
  .catch((err) => console.error('Error sending alert:', err));
};

// Save transaction to MongoDB
const saveTransactionToMongo = async (transactionData) => {
 try {
  const transaction = new Transaction(transactionData);
  await transaction.save();
  console.log('Transaction saved to MongoDB:', transaction._id);
 } catch (err) {
  console.error('Error saving transaction to MongoDB:', err);
 }
};

const processMessage = async (message) => {
 const transaction = JSON.parse(message.value);
 console.log('Transaction received:', transaction);

 // Save transaction to MongoDB
 await saveTransactionToMongo(transaction);

 // Send an alert for high-value transactions
 if (transaction.amount >= 4000000) {
  await sendAlert(transaction);
 }
};

// Kafka consumer event for incoming messages
const startConsumer = async () => {
 await consumer.connect();
 await consumer.subscribe({ topic: 'transaction-data', fromBeginning: true });

 await consumer.run({
  eachMessage: async ({ message }) => {
   await processMessage(message);
  },
 });
};

process.on('SIGINT', async () => {
 console.log('Shutting down gracefully...');
 await consumer.disconnect();
 process.exit(0);
});

startConsumer().catch(console.error);

app.listen(process.env.PORTB, () => {
 console.log('Weather Consumer running on port', process.env.PORTB);
});
