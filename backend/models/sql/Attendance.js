import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Attendance = sequelize.define('Attendance', {
    promotionId: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    studentId:   { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    date:        { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    status:      { type: DataTypes.STRING, defaultValue: '' },
    note:        { type: DataTypes.TEXT,   defaultValue: '' }
}, {
    tableName: 'attendance',
    underscored: false,
    timestamps: false,
    indexes: [
        // Frequent: retrieve all attendance for a promotion+month (LIKE 'YYYY-MM-%' query)
        { name: 'idx_attendance_promotionId_date', fields: ['promotionId', 'date'] },
        // Frequent: retrieve all attendance rows for a single student
        { name: 'idx_attendance_studentId', fields: ['studentId'] }
    ]
});

export default Attendance;
