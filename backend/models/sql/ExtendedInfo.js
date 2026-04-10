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
 * ExtendedInfo — one row per promotion.
 * Most complex nested data (schedule, team, resources, competences,
 * pildoras, modulesPildoras, projectCompetences, projectEvaluations,
 * virtualClassroom, sharedNotes) stored as JSON.
 */
const ExtendedInfo = sequelize.define('ExtendedInfo', {
    id:                  { type: DataTypes.STRING, primaryKey: true },
    promotionId:         { type: DataTypes.STRING, allowNull: false },
    schedule:            { type: DataTypes.TEXT,   defaultValue: '{}',  get() { return parseJson(this.getDataValue('schedule'), {}); },            set(v) { this.setDataValue('schedule', typeof v === 'string' ? v : JSON.stringify(v)); } },
    team:                { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('team'), []); },                  set(v) { this.setDataValue('team', typeof v === 'string' ? v : JSON.stringify(v)); } },
    resources:           { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('resources'), []); },            set(v) { this.setDataValue('resources', typeof v === 'string' ? v : JSON.stringify(v)); } },
    pildoras:            { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('pildoras'), []); },              set(v) { this.setDataValue('pildoras', typeof v === 'string' ? v : JSON.stringify(v)); } },
    modulesPildoras:     { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('modulesPildoras'), []); },      set(v) { this.setDataValue('modulesPildoras', typeof v === 'string' ? v : JSON.stringify(v)); } },
    competences:         { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('competences'), []); },          set(v) { this.setDataValue('competences', typeof v === 'string' ? v : JSON.stringify(v)); } },
    projectCompetences:  { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('projectCompetences'), []); },   set(v) { this.setDataValue('projectCompetences', typeof v === 'string' ? v : JSON.stringify(v)); } },
    projectEvaluations:  { type: DataTypes.TEXT,   defaultValue: '[]',  get() { const v = parseJson(this.getDataValue('projectEvaluations'), []); return Array.isArray(v) ? v : []; },   set(v) { this.setDataValue('projectEvaluations', typeof v === 'string' ? v : JSON.stringify(v)); } },
    virtualClassroom:    { type: DataTypes.TEXT,   defaultValue: '{}',  get() { return parseJson(this.getDataValue('virtualClassroom'), {}); },     set(v) { this.setDataValue('virtualClassroom', typeof v === 'string' ? v : JSON.stringify(v)); } },
    sharedNotes:         { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('sharedNotes'), []); },          set(v) { this.setDataValue('sharedNotes', typeof v === 'string' ? v : JSON.stringify(v)); } },
    promotionResources:  { type: DataTypes.TEXT,   defaultValue: '[]',  get() { return parseJson(this.getDataValue('promotionResources'), []); },    set(v) { this.setDataValue('promotionResources', typeof v === 'string' ? v : JSON.stringify(v)); } },
    createdAt:           { type: DataTypes.DATE,   defaultValue: DataTypes.NOW }
}, { tableName: 'extended_info', underscored: false, timestamps: false });

export default ExtendedInfo;
