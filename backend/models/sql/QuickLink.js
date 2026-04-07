import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const QuickLink = sequelize.define('QuickLink', {
    id:          { type: DataTypes.STRING,  primaryKey: true },
    promotionId: { type: DataTypes.STRING,  allowNull: false },
    name:        { type: DataTypes.STRING,  allowNull: false, defaultValue: '' },
    url:         { type: DataTypes.TEXT,    allowNull: false },
    platform:    { type: DataTypes.STRING,  allowNull: true, defaultValue: 'custom' },
    createdAt:   { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
}, { tableName: 'quick_links', underscored: false, timestamps: false });

export default QuickLink;
