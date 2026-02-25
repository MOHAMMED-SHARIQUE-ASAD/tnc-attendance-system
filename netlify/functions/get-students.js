const { google } = require('googleapis');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Get all students
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Students!A:E',
    });

    const rows = response.data.values || [];
    const students = [];

    // Skip header row (assumes row 1 has headers)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[1]) { // Must have register no and name
        students.push({
          reg: row[0].toString().trim(),
          name: row[1].toString().trim(),
          password: row[2] ? row[2].toString().trim() : row[0].toString().trim(),
          batch: row[3] ? row[3].toString().trim() : 'A',
          year: row[4] ? row[4].toString().trim() : '1st'
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        students,
        total: students.length
      })
    };

  } catch (error) {
    console.error('Get students error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        students: [] 
      })
    };
  }
};