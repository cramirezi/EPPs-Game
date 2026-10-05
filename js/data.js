// Catálogo de EPPs, áreas, misiones y niveles del juego.
// Para adaptar el juego a otra planta basta con editar este archivo.

// slot: dónde se dibuja el EPP sobre el rostro del jugador (realidad aumentada).
export const EPPS = {
  casco:      { name: 'Casco de seguridad',        icon: '⛑️', slot: 'head',  why: 'Protege la cabeza de golpes y caída de objetos.' },
  cofia:      { name: 'Cofia / redecilla',         icon: '🧑‍🍳', slot: 'head',  why: 'Evita que el cabello contamine el producto.' },
  lentes:     { name: 'Lentes de seguridad',       icon: '🥽', slot: 'eyes',  why: 'Protegen los ojos de partículas y salpicaduras.' },
  goggles:    { name: 'Goggles herméticos',        icon: '🤿', slot: 'eyes',  why: 'Sellan los ojos contra polvo fino en suspensión.' },
  auditivo:   { name: 'Protector auditivo',        icon: '🎧', slot: 'ears',  why: 'Reduce la exposición a ruido sobre 85 dB.' },
  respirador: { name: 'Respirador para polvo',     icon: '😷', slot: 'mouth', why: 'Filtra el polvo en suspensión que se respira.' },
  mascarilla: { name: 'Mascarilla sanitaria',      icon: '🩺', slot: 'mouth', why: 'Barrera sanitaria para no contaminar el producto.' },
  chaleco:    { name: 'Chaleco reflectivo',        icon: '🦺', slot: 'chest', why: 'Te hace visible para conductores y montacargas.' },
  guantes:    { name: 'Guantes de seguridad',      icon: '🧤', slot: 'hands', why: 'Protegen las manos de cortes y golpes.' },
  nitrilo:    { name: 'Guantes de nitrilo',        icon: '🫳', slot: 'hands', why: 'Evitan contacto de la piel con aditivos y químicos.' },
  calzado:    { name: 'Calzado de seguridad',      icon: '🥾', slot: 'feet',  why: 'Punta de acero y suela antideslizante.' },
  overol:     { name: 'Overol / mandil',           icon: '🥼', slot: 'body',  why: 'Evita que el polvo se impregne en tu ropa y piel.' },
  arnes:      { name: 'Arnés anticaídas',          icon: '🪢', slot: 'body',  why: 'Obligatorio para trabajos sobre 1.8 m de altura.' },
  careta:     { name: 'Careta facial',             icon: '🛡️', slot: 'face',  why: 'Protege todo el rostro de salpicaduras químicas.' },
  linterna:   { name: 'Linterna',                  icon: '🔦', slot: 'hands', why: 'Necesaria para inspeccionar zonas sin iluminación.' },
  // Distractores: NO son EPP o están prohibidos en planta.
  gorra:      { name: 'Gorra',                     icon: '🧢', slot: 'head',  why: 'No es EPP: no protege contra impactos.', distractor: true },
  gafasSol:   { name: 'Lentes de sol',             icon: '🕶️', slot: 'eyes',  why: 'No son EPP: no resisten impactos.', distractor: true },
  musica:     { name: 'Audífonos de música',       icon: '🎵', slot: 'ears',  why: 'Te aíslan de alarmas y avisos: prohibidos en planta.', distractor: true },
  sandalias:  { name: 'Sandalias',                 icon: '🩴', slot: 'feet',  why: 'Prohibidas: dejan el pie expuesto.', distractor: true },
  joyas:      { name: 'Anillos y joyas',           icon: '💍', slot: 'hands', why: 'Prohibidas: pueden engancharse en máquinas y contaminar.', distractor: true },
  bufanda:    { name: 'Bufanda',                   icon: '🧣', slot: 'chest', why: 'Prenda suelta: riesgo de atrapamiento.', distractor: true },
  celular:    { name: 'Celular en mano',           icon: '📱', slot: 'hands', why: 'Distracción: prohibido usarlo al caminar en planta.', distractor: true },
};

// Cada área tiene misiones de dificultad 1 a 3. Los niveles altos eligen misiones más difíciles.
export const AREAS = [
  {
    id: 'patio',
    name: 'Patio de maniobras',
    icon: '🚛',
    color: '#f59e0b',
    hazard: 'Tránsito de camiones y montacargas',
    missions: [
      { diff: 1, title: 'Guiar la descarga de un camión',
        text: 'Debes guiar a un camión hasta la rampa de descarga.',
        required: ['casco', 'chaleco', 'calzado'] },
      { diff: 2, title: 'Inspección de carga',
        text: 'Revisa amarres y estado de la carga sobre la plataforma del camión.',
        required: ['casco', 'chaleco', 'calzado', 'guantes', 'lentes'] },
      { diff: 3, title: 'Lona del camión en altura, turno noche',
        text: 'De noche, sube a la plataforma (2.5 m) para retirar la lona con montacargas operando cerca.',
        required: ['casco', 'chaleco', 'calzado', 'guantes', 'arnes', 'linterna', 'auditivo'] },
    ],
  },
  {
    id: 'micro',
    name: 'Microingredientes',
    icon: '🌫️',
    color: '#a78bfa',
    hazard: 'Polvo en suspensión',
    missions: [
      { diff: 1, title: 'Pesaje de aditivos',
        text: 'Pesa microingredientes en polvo. Hay bastante polvo en suspensión.',
        required: ['respirador', 'goggles', 'nitrilo', 'calzado'] },
      { diff: 2, title: 'Carga de la mezcladora',
        text: 'Vacía sacos de premezcla en la tolva. El polvo y el ruido son altos.',
        required: ['respirador', 'goggles', 'nitrilo', 'calzado', 'overol', 'auditivo'] },
      { diff: 3, title: 'Limpieza del área con químicos',
        text: 'Limpieza profunda: polvo residual y desinfectante químico en pulverizador.',
        required: ['respirador', 'goggles', 'careta', 'nitrilo', 'calzado', 'overol', 'cofia'] },
    ],
  },
  {
    id: 'envasado',
    name: 'Envasado',
    icon: '📦',
    color: '#22c55e',
    hazard: 'Ruido, máquinas en movimiento e inocuidad',
    missions: [
      { diff: 1, title: 'Operar la ensacadora',
        text: 'Opera la línea de ensacado. Recuerda la inocuidad del producto.',
        required: ['cofia', 'auditivo', 'calzado'] },
      { diff: 2, title: 'Cambio de formato en la línea',
        text: 'Ajusta guías y cuchillas de la selladora para un nuevo tamaño de saco.',
        required: ['cofia', 'auditivo', 'calzado', 'guantes', 'lentes'] },
      { diff: 3, title: 'Producto expuesto en la línea',
        text: 'Trabajas junto a producto abierto, con la selladora y ruido de la línea.',
        required: ['cofia', 'mascarilla', 'auditivo', 'calzado', 'guantes', 'lentes'] },
    ],
  },
  {
    id: 'admin',
    name: 'Administrativo',
    icon: '💼',
    color: '#38bdf8',
    hazard: 'Ergonomía y tránsito por planta',
    missions: [
      { diff: 1, title: 'Trabajo en oficina',
        text: 'Hoy trabajas en tu escritorio. ¡No exageres con el EPP! Elige solo lo necesario.',
        required: ['calzado'] },
      { diff: 2, title: 'Entregar documentos en el almacén',
        text: 'Cruza la planta caminando para entregar documentos en el almacén.',
        required: ['calzado', 'casco', 'chaleco', 'lentes'] },
      { diff: 3, title: 'Auditoría en planta',
        text: 'Acompañas una auditoría que recorre envasado y patio de maniobras.',
        required: ['calzado', 'casco', 'chaleco', 'lentes', 'auditivo', 'cofia'] },
    ],
  },
  {
    id: 'consola',
    name: 'Consola',
    icon: '🖥️',
    color: '#f472b6',
    hazard: 'Sala de control y salidas a campo',
    missions: [
      { diff: 1, title: 'Operación desde sala de control',
        text: 'Monitoreas el proceso desde la consola de la sala de control.',
        required: ['calzado'] },
      { diff: 2, title: 'Verificar una alarma en campo',
        text: 'Una alarma de la consola te obliga a ir a revisar un equipo en planta.',
        required: ['calzado', 'casco', 'lentes', 'auditivo'] },
      { diff: 3, title: 'Falla eléctrica: recorrido nocturno',
        text: 'Corte de energía de noche: recorre planta y patio para verificar equipos.',
        required: ['calzado', 'casco', 'lentes', 'auditivo', 'chaleco', 'linterna', 'guantes'] },
    ],
  },
];

// Niveles: menos tiempo, más opciones en pantalla, menos errores permitidos,
// más penalidad de tiempo por error y, al final, tarjetas que cambian de lugar.
// lives: errores permitidos antes de perder la misión (0 = ilimitado).
export const LEVELS = [
  { n: 1, name: 'Inducción',          time: 60, cards: 8,  maxDiff: 1, showCount: true,  penalty: 0, lives: 0, shuffleEvery: 0 },
  { n: 2, name: 'Operario',           time: 50, cards: 10, maxDiff: 2, showCount: true,  penalty: 3, lives: 4, shuffleEvery: 0 },
  { n: 3, name: 'Técnico',            time: 45, cards: 12, maxDiff: 2, showCount: false, penalty: 5, lives: 3, shuffleEvery: 0 },
  { n: 4, name: 'Supervisor',         time: 40, cards: 14, maxDiff: 3, showCount: false, penalty: 5, lives: 3, shuffleEvery: 12 },
  { n: 5, name: 'Experto en Safety',  time: 35, cards: 16, maxDiff: 3, showCount: false, penalty: 7, lives: 2, shuffleEvery: 8 },
];

// Puntaje
export const SCORE = {
  correct: 100,     // por EPP correcto
  wrong: -50,       // por EPP incorrecto seleccionado
  missing: -75,     // por EPP requerido que faltó
  perSecond: 10,    // bonus por segundo restante
  perfect: 300,     // misión perfecta
};
