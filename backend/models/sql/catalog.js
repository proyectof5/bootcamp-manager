import { DataTypes } from 'sequelize';
import sequelize from '../../db/sequelize.js';

export const Competence = sequelize.define('Competence', {
    id:          { type: DataTypes.INTEGER, primaryKey: true },
    name:        { type: DataTypes.STRING,  allowNull: false },
    description: { type: DataTypes.TEXT,    allowNull: true }
}, { tableName: 'competences', underscored: false, timestamps: false });

export const Indicator = sequelize.define('Indicator', {
    id:          { type: DataTypes.INTEGER, primaryKey: true },
    name:        { type: DataTypes.STRING,  allowNull: false },
    description: { type: DataTypes.TEXT,    allowNull: true },
    levelId:     { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'indicators', underscored: false, timestamps: false });

export const Tool = sequelize.define('Tool', {
    id:          { type: DataTypes.INTEGER, primaryKey: true },
    name:        { type: DataTypes.STRING,  allowNull: false },
    description: { type: DataTypes.TEXT,    allowNull: true }
}, { tableName: 'tools', underscored: false, timestamps: false });

export const Area = sequelize.define('Area', {
    id:          { type: DataTypes.INTEGER, primaryKey: true },
    name:        { type: DataTypes.STRING,  allowNull: false },
    icon:        { type: DataTypes.STRING,  allowNull: true },
    description: { type: DataTypes.TEXT,    allowNull: true }
}, { tableName: 'areas', underscored: false, timestamps: false });

export const Level = sequelize.define('Level', {
    id:          { type: DataTypes.INTEGER, primaryKey: true },
    name:        { type: DataTypes.STRING,  allowNull: false },
    description: { type: DataTypes.TEXT,    allowNull: true }
}, { tableName: 'levels', underscored: false, timestamps: false });

export const Resource = sequelize.define('Resource', {
    id:       { type: DataTypes.INTEGER, primaryKey: true },
    label:    { type: DataTypes.STRING,  allowNull: false },
    url:      { type: DataTypes.STRING,  allowNull: true },
    comments: { type: DataTypes.TEXT,    allowNull: true }
}, { tableName: 'resources', underscored: false, timestamps: false });

export const CompetenceIndicator = sequelize.define('CompetenceIndicator', {
    id:             { type: DataTypes.INTEGER, primaryKey: true },
    id_competence:  { type: DataTypes.INTEGER, allowNull: false },
    id_indicator:   { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'competence_indicators', underscored: false, timestamps: false });

export const CompetenceTool = sequelize.define('CompetenceTool', {
    id:            { type: DataTypes.INTEGER, primaryKey: true },
    id_competence: { type: DataTypes.INTEGER, allowNull: false },
    id_tool:       { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'competence_tools', underscored: false, timestamps: false });

export const CompetenceArea = sequelize.define('CompetenceArea', {
    id:            { type: DataTypes.INTEGER, primaryKey: true },
    id_competence: { type: DataTypes.INTEGER, allowNull: false },
    id_area:       { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'competence_areas', underscored: false, timestamps: false });
