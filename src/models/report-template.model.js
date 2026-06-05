const mongoose = require('mongoose');

const reportFieldSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true,
        trim: true
    },
    isRequired: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, { _id: true });

const reportTemplateSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    userId: {
        type: String,
        default: 'default',
        index: true
    },
    fields: {
        type: [reportFieldSchema],
        default: []
    }
}, {
    timestamps: true,
    collection: 'reportTemplates'
});

const ReportTemplate = mongoose.model('ReportTemplate', reportTemplateSchema);

module.exports = ReportTemplate;
