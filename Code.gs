// Función para obtener la API Key de Asana desde las propiedades de la secuencia de comandos
function getAsanaApiKey() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('Asana_API_Key');
}

// Función para obtener el token de GitHub desde las propiedades de la secuencia de comandos
function getGitHubToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('GitHub_Token');
}

// Función para obtener las últimas 20 tareas de Asana en el workspace especificado
function getAsanaTasks() {
  const apiKey = getAsanaApiKey();
  const workspaceId = '9620850264019';
  const url = `https://app.asana.com/api/1.0/tasks?workspace=${workspaceId}&assignee=me&limit=20&opt_fields=name,notes,assignee.name,created_at,completed,due_on,modified_at,custom_fields`;

  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`Error al obtener tareas de Asana: ${response.getContentText()}`);
  }
  const data = JSON.parse(response.getContentText());
  const tasks = data.data.map(task => ({
    id: task.id,
    name: task.name,
    notes: task.notes,
    assignee: task.assignee ? task.assignee.name : 'Unassigned',
    createdAt: task.created_at,
    modifiedAt: task.modified_at,
    dueOn: task.due_on,
    completed: task.completed,
    customFields: task.custom_fields ? task.custom_fields.map(field => ({
      name: field.name,
      value: field.display_value
    })) : []
  }));
  return tasks;
}

// Función para obtener la versión del código desde GitHub
function getCodeVersion() {
  const repo = 'Elpeladete/RegistroExpo';
  const commitsUrl = `https://api.github.com/repos/${repo}/commits`;
  const tagsUrl = `https://api.github.com/repos/${repo}/tags`;
  const token = getGitHubToken();

  const options = {
    'muteHttpExceptions': true, // Para obtener la respuesta completa incluso en caso de error
    'headers': {
      'Authorization': `token ${token}`
    }
  };

  const commitsResponse = UrlFetchApp.fetch(commitsUrl, options);
  if (commitsResponse.getResponseCode() !== 200) {
    throw new Error(`Error al obtener commits: ${commitsResponse.getContentText()}`);
  }
  const commits = JSON.parse(commitsResponse.getContentText());
  const latestCommit = commits[0].sha.substring(0, 7);

  const tagsResponse = UrlFetchApp.fetch(tagsUrl, options);
  if (tagsResponse.getResponseCode() !== 200) {
    throw new Error(`Error al obtener tags: ${tagsResponse.getContentText()}`);
  }
  const tags = JSON.parse(tagsResponse.getContentText());
  const latestTag = tags.length > 0 ? tags[0].name : 'no-tag';

  const date = new Date();
  const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd');

  return `${latestTag}.${latestCommit}.${formattedDate}`;
}

// Función para mostrar la página de inicio de sesión al abrir la hoja de cálculo
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Ticket Manager')
    .addItem('Abrir Interfaz', 'showLogin')
    .addToUi();
}

// Función para mostrar la página de inicio de sesión
function showLogin() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('Login')
    .setWidth(400)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Iniciar Sesión');
}

// Función para manejar solicitudes GET y mostrar la página de inicio de sesión por defecto
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Login')
    .setWidth(400)
    .setHeight(500);
}

// Función para validar el inicio de sesión
function validateLogin(username, password) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const url = scriptProperties.getProperty('URL_Sheet');
  const response = UrlFetchApp.fetch(url);
  const csvContent = response.getContentText();
  const data = Utilities.parseCsv(csvContent);
  const headers = data[0];
  const users = data.slice(1);

  // Buscar el usuario y contraseña en el CSV
  for (let i = 0; i < users.length; i++) {
    if (users[i][0] === username && users[i][1] === password) {
      // Almacenar los datos completos del usuario
      const user = {};
      for (let j = 0; 0 < headers.length; j++) {
        user[headers[j]] = users[i][j];
      }
      // Guardar los datos del usuario en la caché de la aplicación
      const cache = CacheService.getUserCache();
      cache.put('currentUser', JSON.stringify(user), 3600);
      return true;
    }
  }
  return false;
}

// Función para obtener la interfaz de gestión de tickets después del inicio de sesión
function showInterface() {
  const htmlOutput = HtmlService.createHtmlOutputFromFile('Index');
  return htmlOutput.getContent();
}

// Función para registrar un nuevo ticket
function registerTicket(ticket) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tickets');
  if (!sheet) {
    throw new Error('La hoja "Tickets" no existe.');
  }
  sheet.appendRow([ticket.id, ticket.date, ticket.client, ticket.deviceType, ticket.description, ticket.status, ticket.assignedTechnician]);
}

// Función para obtener todos los tickets
function getTickets() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tickets');
  if (!sheet) {
    throw new Error('La hoja "Tickets" no existe.');
  }
  const data = sheet.getDataRange().getValues();
  return data.slice(1); // Excluir la fila de encabezado
}