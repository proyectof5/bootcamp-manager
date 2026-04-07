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
 * BootcampTemplate table.
 * All nested arrays (modules, resources, competences, employability,
 * modulesPildoras, schedule) stored as JSON.
 */
const BootcampTemplate = sequelize.define('BootcampTemplate', {
    id:              { type: DataTypes.STRING,  primaryKey: true },
    name:            { type: DataTypes.STRING,  allowNull: false },
    description:     { type: DataTypes.TEXT,    defaultValue: '' },
    type:            { type: DataTypes.STRING,  defaultValue: 'bootcamp' },
    language:        { type: DataTypes.STRING,  defaultValue: 'es' },
    modules:         { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('modules'), []); },         set(v) { this.setDataValue('modules', typeof v === 'string' ? v : JSON.stringify(v)); } },
    resources:       { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('resources'), []); },        set(v) { this.setDataValue('resources', typeof v === 'string' ? v : JSON.stringify(v)); } },
    employability:   { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('employability'), []); },    set(v) { this.setDataValue('employability', typeof v === 'string' ? v : JSON.stringify(v)); } },
    competences:     { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('competences'), []); },      set(v) { this.setDataValue('competences', typeof v === 'string' ? v : JSON.stringify(v)); } },
    schedule:        { type: DataTypes.TEXT,    defaultValue: '{}',  get() { return parseJson(this.getDataValue('schedule'), {}); },         set(v) { this.setDataValue('schedule', typeof v === 'string' ? v : JSON.stringify(v)); } },
    modulesPildoras: { type: DataTypes.TEXT,    defaultValue: '[]',  get() { return parseJson(this.getDataValue('modulesPildoras'), []); }, set(v) { this.setDataValue('modulesPildoras', typeof v === 'string' ? v : JSON.stringify(v)); } },
    isDefault:       { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt:       { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
}, { tableName: 'bootcamp_templates', underscored: false, timestamps: false });

export default BootcampTemplate;
