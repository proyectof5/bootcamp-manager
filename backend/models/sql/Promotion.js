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
 * Promotions table.
 * Complex nested fields (modules, employability, collaboratorModules,
 * passwordChangeHistory, holidays) are stored as JSON.
 */
const Promotion = sequelize.define('Promotion', {
    id:                    { type: DataTypes.STRING,  primaryKey: true },
    name:                  { type: DataTypes.STRING,  allowNull: false },
    description:           { type: DataTypes.TEXT,    defaultValue: '' },
    startDate:             { type: DataTypes.STRING,  allowNull: true },
    endDate:               { type: DataTypes.STRING,  allowNull: true },
    location:              { type: DataTypes.STRING,  defaultValue: '' },
    status:                { type: DataTypes.STRING,  defaultValue: 'active' },
    type:                  { type: DataTypes.STRING,  defaultValue: 'bootcamp' },
    language:              { type: DataTypes.STRING,  defaultValue: 'es' },
    accessPassword:        { type: DataTypes.STRING,  allowNull: true },
    teacherId:             { type: DataTypes.STRING,  allowNull: true },
    templateId:            { type: DataTypes.STRING,  allowNull: true },
    weeks:                 { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    teachingContentUrl:    { type: DataTypes.TEXT,    allowNull: true, defaultValue: null },
    asanaWorkspaceUrl:     { type: DataTypes.TEXT,    allowNull: true, defaultValue: null },
    googleCalendarId:      { type: DataTypes.STRING,  allowNull: true, defaultValue: null },
    modules:               { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('modules'), []); },               set(v) { this.setDataValue('modules', typeof v === 'string' ? v : JSON.stringify(v)); } },
    employability:         { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('employability'), []); },         set(v) { this.setDataValue('employability', typeof v === 'string' ? v : JSON.stringify(v)); } },
    ownerModules:          { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('ownerModules'), []); },           set(v) { this.setDataValue('ownerModules', typeof v === 'string' ? v : JSON.stringify(v)); } },
    collaborators:         { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('collaborators'), []); },         set(v) { this.setDataValue('collaborators', typeof v === 'string' ? v : JSON.stringify(v)); } },
    collaboratorModules:   { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('collaboratorModules'), {}); },   set(v) { this.setDataValue('collaboratorModules', typeof v === 'string' ? v : JSON.stringify(v)); } },
    passwordChangeHistory: { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('passwordChangeHistory'), []); }, set(v) { this.setDataValue('passwordChangeHistory', typeof v === 'string' ? v : JSON.stringify(v)); } },
    holidays:              { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('holidays'), []); },               set(v) { this.setDataValue('holidays', typeof v === 'string' ? v : JSON.stringify(v)); } },
    createdAt:             { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
}, { tableName: 'promotions', underscored: false, timestamps: false });

export default Promotion;
