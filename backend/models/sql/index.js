/**
 * Central SQL models index.
 * Import this file once at app startup — it syncs all tables
 * and re-exports every model.
 *
 * Usage in server.js:
 *   import { db, Teacher, Promotion, Student, ... } from './backend/models/sql/index.js';
 *   await db.sync({ alter: true });   // or { force: false } in production
 */

import sequelize from '../../db/sequelize.js';

import Teacher          from './Teacher.js';
import Promotion        from './Promotion.js';
import Student          from './Student.js';
import QuickLink        from './QuickLink.js';
import Section          from './Section.js';
import ExtendedInfo     from './ExtendedInfo.js';
import Attendance       from './Attendance.js';
import BootcampTemplate from './BootcampTemplate.js';
import {
    Competence,
    Indicator,
    Tool,
    Area,
    Level,
    Resource,
    CompetenceIndicator,
    CompetenceTool,
    CompetenceArea
} from './catalog.js';

export {
    sequelize as db,
    Teacher,
    Promotion,
    Student,
    QuickLink,
    Section,
    ExtendedInfo,
    Attendance,
    BootcampTemplate,
    Competence,
    Indicator,
    Tool,
    Area,
    Level,
    Resource,
    CompetenceIndicator,
    CompetenceTool,
    CompetenceArea
};
