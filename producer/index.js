import express from 'express';
import { Kafka, Partitioners } from 'kafkajs';
import { faker } from '@faker-js/faker';
import cron from 'node-cron';

const app = express();
app.use(express.json());

// Kafka producer configuration
const kafka = new Kafka({
 clientId: 'app-producer',
 brokers: ['kafka:29092'],
});

const producer = kafka.producer({
 retry: {
  retries: 8, // Increase the number of retries
 }
});

// Add health check route
app.get('/health', (req, res) => {
 res.status(200).json({ status: 'OK', message: 'Producer service is healthy' });
});

// Kafka producer event for sending data
async function sendToKafka(data) {
 try {
  await producer.connect();
  const messages = data.map((item) => ({
   value: JSON.stringify(item, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
   ),
  }));
  await producer.send({
   topic: 'transaction-data',
   messages,
  });
 } catch (error) {
  console.error('Error sending data to Kafka:', error);
 } finally {
  await producer.disconnect();
 }
}

// Generate and send transaction data to Kafka every 15 minutes
const generateTransactions = async () => {
 let transactions = [];
 for (let i = 0; i < 20; i++) {
  let transaction = {
   id: faker.string.uuid(),
   amount: faker.number.int({ min: 1000, max: 5000000 }),
   fullName: faker.person.fullName(),
   accountName: faker.finance.accountName(),
   accountNumber: faker.finance.accountNumber(5),
   timestamp: new Date().toISOString(),
   location: faker.location.city(),
  };
  transactions.push(transaction);
 }

 if (transactions.length > 0) {
  await sendToKafka(transactions);
 }
 return transactions;
};

// Initial run
await generateTransactions().then((data) => {
 if (data) {
  console.log('Initial weather data sent to Kafka:', data);
 }
});

// Schedule the task to run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
 const transactionData = await generateTransactions();
 if (transactionData) {
  console.log('Weather data sent to Kafka:', transactionData);
 }
});

app.listen(process.env.PORTA, () => {
 console.log('Weather Producer running on port', process.env.PORTA);
});
