import mongoose from 'mongoose'

const categories = ['Groceries', 'Dining', 'Transport', 'Shopping', 'Subscriptions', 'Housing', 'Other']

const expenseSchema = new mongoose.Schema({
  merchant: { type: String, required: true, trim: true, maxlength: 60 },
  category: { type: String, required: true, enum: categories },
  amount: { type: Number, required: true, min: 0.01 },
  date: {
    type: String,
    required: true,
    validate: {
      validator: (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const parsed = new Date(`${value}T00:00:00.000Z`)
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      },
      message: 'Enter a valid date.',
    },
  },
  note: { type: String, trim: true, maxlength: 80, default: '' },
}, { timestamps: true })

expenseSchema.set('toJSON', {
  transform(_document, result) {
    result.id = result._id.toString()
    delete result._id
    delete result.__v
    delete result.createdAt
    delete result.updatedAt
    return result
  },
})

export default mongoose.model('Expense', expenseSchema)