import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usosDeHerramientas, areasDe, rubricasConHerramientas } from './stack.ts';

// Catálogo de la promoción: solo sirve para resolver id → nombre y área.
const competencias = [
    { id: 1, name: 'Configura su entorno', area: 'Fullstack', selectedTools: ['Docker', 'Git', 'GitHub', 'Linux'] },
    { id: 2, name: 'Gestionar equipos', area: 'Fullstack', selectedTools: ['GitHub', 'Scrum'] },
    { id: 13, name: 'Evaluar datos', area: 'IA', selectedTools: ['Excel', 'Python'] },
];

// Lo que de verdad se evalúa, por proyecto.
const rubricas = [
    { moduleId: 'm1', projectName: 'Landing Page', competenceTools: { '1': ['Git', 'GitHub'], '2': ['GitHub'] } },
    { moduleId: 'm2', projectName: 'App con Python', competenceTools: { '1': ['Git'], '13': ['Python'] } },
];

test('sale de las rúbricas de evaluación, no de las del programa', () => {
    const nombres = usosDeHerramientas(competencias, rubricas).map(u => u.herramienta);
    assert.deepEqual(nombres, ['Git', 'GitHub', 'Python']);
    // Docker, Linux, Scrum y Excel están en el programa pero no se evalúan.
    for (const fuera of ['Docker', 'Linux', 'Scrum', 'Excel']) {
        assert.ok(!nombres.includes(fuera), `${fuera} no debería estar`);
    }
});

test('cruza cada herramienta con su competencia y su proyecto', () => {
    const u = usosDeHerramientas(competencias, rubricas);
    const github = u.find(x => x.herramienta === 'GitHub')!;
    assert.deepEqual(github.competencias, ['Configura su entorno', 'Gestionar equipos']);
    assert.deepEqual(github.proyectos, ['Landing Page']);

    const git = u.find(x => x.herramienta === 'Git')!;
    assert.deepEqual(git.proyectos, ['Landing Page', 'App con Python']);   // en dos proyectos
    assert.deepEqual(git.competencias, ['Configura su entorno']);          // sin repetir
});

test('una herramienta evaluada en dos áreas las lista todas', () => {
    const python = usosDeHerramientas(competencias, [
        ...rubricas,
        { projectName: 'Extra', competenceTools: { '1': ['Python'] } },
    ]).find(x => x.herramienta === 'Python')!;
    assert.deepEqual(python.areas, ['IA', 'Fullstack']);
});

test('una competencia que ya no está en el programa no se pierde', () => {
    const u = usosDeHerramientas(competencias, [
        { projectName: 'Huérfano', competenceTools: { '99': ['Kubernetes'] } },
    ]);
    assert.equal(u.length, 1);
    assert.deepEqual(u[0].competencias, ['99']);
    assert.deepEqual(u[0].areas, ['Sin área']);
    assert.deepEqual(areasDe(competencias, u), ['Sin área']);
});

test('tolera vacíos y basura', () => {
    assert.deepEqual(usosDeHerramientas([], []), []);
    assert.deepEqual(usosDeHerramientas(null as never, null as never), []);
    const u = usosDeHerramientas(competencias, [
        { projectName: 'P', competenceTools: { '1': ['  ', '', null, ' Redis '] } },
        { projectName: 'Q' },                       // sin competenceTools
    ]);
    assert.equal(u.length, 1);
    assert.equal(u[0].herramienta, 'Redis');        // recortado
});

test('areasDe solo devuelve áreas con herramientas evaluadas', () => {
    const u = usosDeHerramientas(competencias, rubricas);
    assert.deepEqual(areasDe(competencias, u), ['Fullstack', 'IA']);
    const soloFullstack = usosDeHerramientas(competencias, [rubricas[0]]);
    assert.deepEqual(areasDe(competencias, soloFullstack), ['Fullstack']);
});

test('rubricasConHerramientas ignora las que están vacías', () => {
    assert.equal(rubricasConHerramientas(rubricas), 2);
    assert.equal(rubricasConHerramientas([{ projectName: 'X', competenceTools: { '1': [] } }]), 0);
    assert.equal(rubricasConHerramientas([]), 0);
});
