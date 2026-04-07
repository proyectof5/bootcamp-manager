import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

/**
 * Teachers table.
 * Authentication is fully delegated to the external auth server (users.coderf5.es).
 * No password is stored locally. `deletedAt` enables soft-delete so historical
 * references in promotions.teacherId remain valid after a teacher is removed.
 */
const Teacher = sequelize.define('Teacher', {
    id:        { type: DataTypes.STRING,  primaryKey: true },
    name:      { type: DataTypes.STRING,  allowNull: false },
    lastName:  { type: DataTypes.STRING,  defaultValue: '' },
    email:     { type: DataTypes.STRING,  allowNull: false, unique: true },
    location:  { type: DataTypes.STRING,  defaultValue: '' },
    userRole:  { type: DataTypes.STRING,  defaultValue: 'Formador/a' },
    deletedAt: { type: DataTypes.DATE,    allowNull: true, defaultValue: null }
}, { tableName: 'teachers', underscored: false, timestamps: false });

export default Teacher;
