import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * Helper: parse a value that may be a JSON string or already an object/array.
 */
const parseJson = (val, fallback) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; } // fall back to raw string if not JSON
    }
    return val;
};

/**
 * Sections table.
 * Each section belongs to a promotion (promotionId).
 * `content` is stored as TEXT and treated as JSON so rich structured data
 * (arrays, objects) can be round-tripped without a schema change.
 */
const Section = sequelize.define('Section', {
    id:          { type: DataTypes.STRING, primaryKey: true },
    promotionId: { type: DataTypes.STRING, allowNull: false },
    title:       { type: DataTypes.STRING, allowNull: false },
    content:     {
        type: DataTypes.TEXT,
        allowNull: false,
        get() { return parseJson(this.getDataValue('content'), ''); },
        set(v) { this.setDataValue('content', typeof v === 'string' ? v : JSON.stringify(v)); }
    }
}, { tableName: 'sections', underscored: false, timestamps: false });

export default Section;
