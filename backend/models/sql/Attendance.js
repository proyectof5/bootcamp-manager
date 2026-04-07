import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

const Attendance = sequelize.define('Attendance', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    promotionId: { type: DataTypes.STRING, allowNull: false },
    studentId:   { type: DataTypes.STRING, allowNull: false },
    date:        { type: DataTypes.STRING, allowNull: false },
    status:      { type: DataTypes.STRING, defaultValue: '' },
    note:        { type: DataTypes.TEXT,   defaultValue: '' }
}, {
    tableName: 'attendance',
    underscored: false,
    timestamps: false,
    indexes: [
        // Unique: one attendance record per (promotion, student, day)
        { unique: true, name: 'uq_attendance_promotion_student_date', fields: ['promotionId', 'studentId', 'date'] },
        // Frequent: retrieve all attendance for a promotion+month (LIKE 'YYYY-MM-%' query)
        { name: 'idx_attendance_promotionId_date', fields: ['promotionId', 'date'] },
        // Frequent: retrieve all attendance rows for a single student
        { name: 'idx_attendance_studentId', fields: ['studentId'] }
    ]
});

export default Attendance;
