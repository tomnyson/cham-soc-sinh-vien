const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
    scope: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    logoDataUrl: {
        type: String,
        default: ''
    },
    subtext: {
        type: String,
        default: 'FPT Polytechnic',
        trim: true,
        maxlength: 80
    },
    primaryColor: {
        type: String,
        default: '#FF6C00',
        trim: true
    },
    updatedBy: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    collection: 'branding'
});

const Branding = mongoose.model('Branding', brandingSchema);

module.exports = Branding;
