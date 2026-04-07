import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * Helper: parse a value that may be a JSON string or already an object/array.
 * MySQL stores JSON columns as longtext, so Sequelize may return a string.
 */
const parseJson = (val, fallback) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
    }
    return val;
};

/**
 * Students table.
 * All nested tracking objects (technicalTracking, transversalTracking,
 * projectsAssignments, progress, withdrawal, accessLog, extendedInfo)
 * are stored as JSON to preserve the rich Mongo schema without
 * dozens of join tables.
 */
const Student = sequelize.define('Student', {
    id:                      { type: DataTypes.STRING,  primaryKey: true },
    name:                    { type: DataTypes.STRING,  allowNull: false },
    lastname:                { type: DataTypes.STRING,  defaultValue: '' },
    email:                   { type: DataTypes.STRING,  allowNull: false },
    phone:                   { type: DataTypes.STRING,  defaultValue: '' },
    age:                     { type: DataTypes.INTEGER, allowNull: true },
    administrativeSituation: { type: DataTypes.STRING,  defaultValue: '' },
    nationality:             { type: DataTypes.STRING,  defaultValue: '' },
    identificationDocument:  { type: DataTypes.STRING,  defaultValue: '' },
    gender:                  { type: DataTypes.STRING,  defaultValue: '' },
    englishLevel:            { type: DataTypes.STRING,  defaultValue: '' },
    educationLevel:          { type: DataTypes.STRING,  defaultValue: '' },
    profession:              { type: DataTypes.STRING,  defaultValue: '' },
    community:               { type: DataTypes.STRING,  defaultValue: '' },
    address:                 { type: DataTypes.TEXT,    defaultValue: '' },
    promotionId:             { type: DataTypes.STRING,  allowNull: true },
    notes:                   { type: DataTypes.TEXT,    defaultValue: '' },
    isManuallyAdded:         { type: DataTypes.BOOLEAN, defaultValue: true },
    isWithdrawn:             { type: DataTypes.BOOLEAN, defaultValue: false },
    progress:                { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('progress'), {}); },            set(v) { this.setDataValue('progress', typeof v === 'string' ? v : JSON.stringify(v)); } },
    projectsAssignments:     { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('projectsAssignments'), []); }, set(v) { this.setDataValue('projectsAssignments', typeof v === 'string' ? v : JSON.stringify(v)); } },
    withdrawal:              { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('withdrawal'), {}); },           set(v) { this.setDataValue('withdrawal', typeof v === 'string' ? v : JSON.stringify(v)); } },
    accessLog:               { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('accessLog'), []); },            set(v) { this.setDataValue('accessLog', typeof v === 'string' ? v : JSON.stringify(v)); } },
    technicalTracking:       { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('technicalTracking'), {}); },    set(v) { this.setDataValue('technicalTracking', typeof v === 'string' ? v : JSON.stringify(v)); } },
    transversalTracking:     { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('transversalTracking'), {}); },  set(v) { this.setDataValue('transversalTracking', typeof v === 'string' ? v : JSON.stringify(v)); } },
    extendedInfo:            { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('extendedInfo'), {}); },          set(v) { this.setDataValue('extendedInfo', typeof v === 'string' ? v : JSON.stringify(v)); } },
    createdAt:               { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
}, {
    tableName: 'students',
    underscored: false,
    timestamps: false,
    indexes: [
        // Frequent: look up all students for a given promotion (promotion detail page, attendance)
        { name: 'idx_students_promotionId', fields: ['promotionId'] },
        // Frequent: filter withdrawn vs active students within a promotion
        { name: 'idx_students_promotionId_isWithdrawn', fields: ['promotionId', 'isWithdrawn'] },
        // Unique lookup by email (login, deduplication)
        { name: 'idx_students_email', fields: ['email'] }
    ]
});

export default Student;
