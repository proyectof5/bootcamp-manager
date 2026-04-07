import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Admin = sequelize.define('Admin', {
    id:        { type: DataTypes.STRING, primaryKey: true },
    name:      { type: DataTypes.STRING, allowNull: false },
    email:     { type: DataTypes.STRING, allowNull: false, unique: true },
    password:  { type: DataTypes.STRING, allowNull: false },
    role:      { type: DataTypes.STRING, defaultValue: 'admin' },
    createdAt: { type: DataTypes.DATE,   defaultValue: DataTypes.NOW }
}, { tableName: 'admins', underscored: false, timestamps: false });

export default Admin;
