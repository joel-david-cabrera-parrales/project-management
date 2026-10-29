import { ChatbotFlow } from '../interfaces/chatbot-flow.interface';

export const TASK_ASSISTANT_FLOW: ChatbotFlow = {
  id: 'task-assistant',
  name: 'Asistente de tareas',
  initialState: 'welcome',
  states: {
    welcome: {
      message: [
        '¡Hola! 👋 Soy Lumi, tu asistente de Task App. Me alegra acompañarte 😊',
        'Puedo ayudarte a consultar tus tareas, crear una tarea, completarla, asignarla o dejar un comentario.',
        'Elige una opción escribiendo exactamente una de estas frases: Ver mis tareas, Crear una tarea, Completar una tarea, Asignar una tarea, Añadir un comentario o Ayuda.',
      ],
      input: {
        type: 'choice',
        saveAs: 'intent',
        required: true,
        options: ['Ver mis tareas', 'Crear una tarea', 'Completar una tarea', 'Asignar una tarea', 'Añadir un comentario', 'Ayuda'],
      },
      transitions: [
        { event: 'SELECT', value: 'Ver mis tareas', target: 'my-tasks', action: 'list-my-tasks' },
        { event: 'SELECT', value: 'Crear una tarea', target: 'choose-workspace', action: 'list-workspaces' },
        { event: 'SELECT', value: 'Completar una tarea', target: 'choose-task-to-complete', action: 'list-open-tasks' },
        { event: 'SELECT', value: 'Asignar una tarea', target: 'choose-task-to-assign', action: 'list-open-tasks' },
        { event: 'SELECT', value: 'Añadir un comentario', target: 'choose-task-to-comment', action: 'list-commentable-tasks' },
        { event: 'SELECT', value: 'Ayuda', target: 'help' },
      ],
    },

    help: {
      message: [
        '¡Claro! ✨ Puedo consultar tus tareas asignadas, crear una tarea en un workspace activo, marcar una tarea como completada, asignarla a un miembro o añadir un comentario.',
        'Para proteger tu espacio, validaré tus permisos y te pediré confirmación antes de realizar cambios. No puedo eliminar tareas, workspaces o miembros desde el chat.',
        'Cuando quieras comenzar, inicia una conversación nueva. ¡Estoy aquí para ayudarte! 💙',
      ],
      terminal: true,
    },

    'my-tasks': {
      message: ['📋 Estas son tus tareas abiertas asignadas:', '{{taskSummary}}', '¡Dime si quieres que te ayude con alguna! 😊'],
      taskCardsFrom: 'taskCards',
      terminal: true,
    },

    'choose-workspace': {
      message: ['¡Vamos a crearla! 🚀 Elige un workspace activo escribiendo su código o nombre:', '{{workspaceSummary}}'],
      input: { type: 'text', saveAs: 'workspaceRef', required: true },
      listItemsFrom: 'workspaceItems',
      transitions: [{ event: 'VALID', target: 'choose-list', action: 'resolve-workspace-for-create' }],
    },
    'choose-list': {
      message: ['Perfecto, {{workspaceTitle}}. Ahora elige una columna por su ID o nombre:', '{{taskListSummary}}'],
      input: { type: 'text', saveAs: 'taskListRef', required: true },
      listItemsFrom: 'taskListItems',
      transitions: [{ event: 'VALID', target: 'task-title', action: 'resolve-task-list' }],
    },
    'task-title': {
      message: '¿Qué título le ponemos a la tarea? ✍️',
      input: { type: 'text', saveAs: 'taskTitle', required: true },
      transitions: [{ event: 'VALID', target: 'task-description' }],
    },
    'task-description': {
      message: 'Si quieres, escribe una breve descripción. Si no, escribe “No”.',
      input: { type: 'text', saveAs: 'taskDescription', required: false },
      transitions: [{ event: 'VALID', target: 'confirm-create-task' }],
    },
    'confirm-create-task': {
      message: [
        'Revisa la tarea antes de crearla 📝',
        '• Workspace: {{workspaceTitle}}',
        '• Columna: {{taskListTitle}}',
        '• Título: {{taskTitle}}',
        '• Descripción: {{taskDescription}}',
        '¿La creo? Responde “Sí” para confirmar o “No” para empezar de nuevo.',
      ],
      input: { type: 'confirmation', required: true },
      transitions: [
        { event: 'CONFIRM', target: 'task-created', action: 'create-task' },
        { event: 'RESTART', target: 'choose-workspace', action: 'list-workspaces' },
      ],
    },
    'task-created': {
      message: ['¡Listo! 🎉 Creé “{{createdTaskTitle}}” en {{workspaceTitle}}. Ya puedes verla en el tablero.'],
      terminal: true,
    },

    'choose-task-to-complete': {
      message: ['¡Te ayudo! ✅ Escribe el código o ID de la tarea que quieres completar:', '{{taskSummary}}'],
      input: { type: 'text', saveAs: 'taskRef', required: true },
      listItemsFrom: 'taskItems',
      transitions: [{ event: 'VALID', target: 'confirm-completion', action: 'resolve-task-to-complete' }],
    },
    'confirm-completion': {
      message: '¿Confirmas que quieres marcar “{{targetTaskTitle}}” como completada? Responde “Sí” o “No”.',
      input: { type: 'confirmation', required: true },
      transitions: [
        { event: 'CONFIRM', target: 'task-completed', action: 'complete-task' },
        { event: 'CANCEL', target: 'choose-task-to-complete', action: 'list-open-tasks' },
      ],
    },
    'task-completed': {
      message: ['¡Tarea completada! 🎉 “{{targetTaskTitle}}” ya está marcada como lista. ¡Buen trabajo! 💪'],
      terminal: true,
    },

    'choose-task-to-assign': {
      message: ['¿A qué tarea le asignamos a alguien? Escribe su código o ID:', '{{taskSummary}}'],
      input: { type: 'text', saveAs: 'taskRef', required: true },
      listItemsFrom: 'taskItems',
      transitions: [{ event: 'VALID', target: 'choose-assignee', action: 'resolve-task-for-assignment' }],
    },
    'choose-assignee': {
      message: ['¿A quién asignamos “{{targetTaskTitle}}”? Escribe el ID, nombre o correo de un miembro:', '{{memberSummary}}'],
      input: { type: 'text', saveAs: 'assigneeRef', required: true },
      listItemsFrom: 'memberItems',
      transitions: [{ event: 'VALID', target: 'confirm-assignment', action: 'resolve-assignee' }],
    },
    'confirm-assignment': {
      message: 'Voy a asignar “{{targetTaskTitle}}” a {{assigneeName}}. ¿Confirmas? Responde “Sí” o “No”.',
      input: { type: 'confirmation', required: true },
      transitions: [
        { event: 'CONFIRM', target: 'task-assigned', action: 'assign-task' },
        { event: 'CANCEL', target: 'choose-task-to-assign', action: 'list-open-tasks' },
      ],
    },
    'task-assigned': {
      message: ['¡Hecho! 🙌 “{{targetTaskTitle}}” quedó asignada a {{assigneeName}}.'],
      terminal: true,
    },

    'choose-task-to-comment': {
      message: ['¿En qué tarea quieres dejar un comentario? Escribe su código o ID:', '{{taskSummary}}'],
      input: { type: 'text', saveAs: 'taskRef', required: true },
      listItemsFrom: 'taskItems',
      transitions: [{ event: 'VALID', target: 'write-comment', action: 'resolve-task-for-comment' }],
    },
    'write-comment': {
      message: 'Entendido, es sobre “{{targetTaskTitle}}”. ¿Qué comentario quieres dejar? 💬',
      input: { type: 'text', saveAs: 'commentText', required: true },
      transitions: [{ event: 'VALID', target: 'confirm-comment' }],
    },
    'confirm-comment': {
      message: 'Tu comentario será: “{{commentText}}”. ¿Lo publico en “{{targetTaskTitle}}”? Responde “Sí” o “No”.',
      input: { type: 'confirmation', required: true },
      transitions: [
        { event: 'CONFIRM', target: 'comment-added', action: 'add-comment' },
        { event: 'CANCEL', target: 'write-comment' },
      ],
    },
    'comment-added': {
      message: ['¡Comentario publicado! 💬 Gracias por mantener al equipo al tanto.'],
      terminal: true,
    },
  },
};
