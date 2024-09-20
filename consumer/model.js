import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
 id: { type: String, required: true },
 amount: { type: Number, required: true },
 fullName: { type: String, required: true },
 accountName: { type: String, required: true },
 accountNumber: { type: String, required: true },
 timestamp: { type: Date, required: true },
 location: { type: String, required: true },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
